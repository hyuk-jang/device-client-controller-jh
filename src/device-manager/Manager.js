'use strict';

const _ = require('underscore');
const Promise = require('bluebird');

const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('../device-commander/AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('./AbstManager');

const Iterator = require('./Iterator');

const Serial = require('../device-controller/serial/Serial');
const SerialWithParser = require('../device-controller/serial/SerialWithParser');
const Socket = require('../device-controller/socket/Socket');

require('../format/define');

// DeviceManager는 DeviceController와 1:1 매칭.
const instanceList = [];
/** @class DeviceManager */
class Manager extends AbstManager {
  /** @param {deviceClientFormat} config */
  constructor(config) {
    super();

    /** DeviceController를 불러옴 */
    let deviceController = null;
    switch (config.connect_type) {
    case 'serial':
      deviceController = _.has(config, 'parser') && !_.isEmpty(config.parser) ? new SerialWithParser(config) : new Serial(config);
      break;
    case 'socket':
      deviceController = new Socket(config);
      break;
    default:
      throw new Error('해당 장치는 없습니다.', config);
    }
    // 해당 장치가 이미 존재하는지 체크
    let foundInstance = _.findWhere(instanceList, {id: deviceController.id});
    // 장치가 존재하지 않는다면 instanceList에 삽입하고 deviceController에 등록
    if(_.isEmpty(foundInstance)){
      // observer 등록
      deviceController.attach(this);
      // Manager에 Device 등록
      this.deviceController = deviceController;
      this.id = deviceController.id;
      // 신규 정의시 instanceList에 저장
      instanceList.push({id: deviceController.id, instance: this});
    } else {  // singleton pattern
      return foundInstance.instance;
    }

    this.retryChance = 3; // 데이터 유효성 검사가 실패, 데이터 수신 에러가 있을 경우 3회까지 ProcessCmd 재전송
    /**
     * @type {{process:commandFormat, rankList: Array.<{rank: number, list: Array.<commandFormat>} }>]  }
     */
    this.commandStorage = {process: {}, rankList: []};
    this.createIterator();

    this.timeoutTimer = null;
  }

  /** Iterator 정의 */
  createIterator() {
    this.iterator = new Iterator(this);
  }

  /**
   * deviceMediator 을 정의
   * @param {AbstMediator} deviceMediator 
   */
  setMediator(deviceMediator) {
    this.mediator = deviceMediator;
  }


  /**
   * 실제 장치로 명령을 보냄
   * @param {*} cmd 각 장치에 맞는 명령 정보
   * @param {number} timeoutMs 장치로 명령을 요청하고 대기하는 ms
   */
  async writeCmdToDevice(cmd, timeoutMs){
    // BU.log('Device write');
    // BU.CLI('장치로 명령 발송 요청', cmd);
    await this.deviceController.write(cmd);
    // BU.CLI('장치로 명령 발송 완료');
    // let testId = this.getReceiver().id;
    // BU.CLI('명령 요청', this.getReceiver().id, timeoutMs);
    // console.time(`timeout ${testId}`);
    this.clearTimeoutTimer();
    this.timeoutTimer = setTimeout(() => {
      // console.timeEnd(`timeout ${testId}`);
      // BU.CLIN(this.getProcessItem())
      this.getReceiver().updateDcError(this.getProcessItem(),new Error('Timeout'), cmd);
      this.nextCommand(false);
      // 명전 전송 후 제한시간안에 응답이 안올 경우 에러 
    }, timeoutMs);

    return true;
  }

  clearTimeoutTimer(){
    if(this.timeoutTimer){
      clearTimeout(this.timeoutTimer);
    }
  }

  /** 
   * write의 후속 결과 처리를 담당하는 컨트롤러 
   * - nextCommand가 요청하였을 경우
   */
  requestWrite(){
    const processItem = this.getProcessItem();
    if(_.isEmpty(processItem)){
      throw new Error(`현재 진행중인 명령이 존재하지 않습니다. ${this.id}`);
    }

    const cmd = processItem.cmdList[processItem.currCmdIndex];

    // 이상한 명령을 요청한다면 수행 불가
    if (cmd === undefined || cmd === null || cmd === '' || BU.isEmpty(cmd)) {
      BU.CLI('해당 명령은 수행할 수 없는 명령입니다.', cmd);
      return this.nextCommand(false);
    }

    // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
    try {
      if(_.isEmpty(this.deviceController.client)){
        BU.log('DeviceController Client Is Empty');
        // this.iterator.clearAllItem();
        return false;
      } 
      return this.writeCmdToDevice(cmd, processItem.timeoutMs);
    } catch (error) {
      BU.CLI(error);
      this.getReceiver().updateDcError(this.getProcessItem(), new Error('Timeout'), cmd);
    }
  }


  /**
   * updateData를 통해 전달받은 데이터에 대한 Commander의 응답을 받을 메소드
   * 응답받은 데이터에 문제가 있거나 다른 사유로 명령을 재 전송하고자 할 경우(3회까지 가능)
   * @param {AbstCommander} commander 
   * @param {string} msg 'isOk', 'retry'
   */
  responseToDataFromCommander(commander, msg){
    // BU.CLI('responseToDataFromCommander');
    let processItem = this.getProcessItem();

    // 현재 진행중인 명령 객체와 일치해야지만 가능
    if(_.isEqual(processItem.commander, commander)){
      try {
        switch (msg) {
        case 'next':
          this.clearTimeoutTimer();
          this.nextCommand(true);          
          break;
        case 'retry':
          this.clearTimeoutTimer();
          this.retryWrite(commander);
          break;
        case 'wait':
          this.clearTimeoutTimer();
          break;
        default:
          break;
        }
      } catch (error) {
        throw error;
      }

    } else {
      throw new Error('현재 진행중인 명령의 Commander와 일치하지 않습니다.');
    }
  }

  /**
   * @private
   * @param {AbstCommander} commander
   * 현재 수행했던 명령을 재 전송. 
   */
  retryWrite(commander){
    // BU.CLI('retryWrite');
    this.retryChance -= 1;
    // 명령을 재요청할 경우 진행중인 timeout 처리는 해제

    if(_.isEqual(commander.currCmd, this.iterator.getCurrentCmd())){
      if (this.retryChance > 0) {
        return Promise.delay(30).then(() => {
          this.requestWrite();
        });
      } else if(this.retryChance === 0){  // 3번 재도전 실패시 다음 명령 수행
        // 해당 에러 발송
        // BU.CLI('retryWrite Max Error');
        this.getReceiver().updateDcError(this.getProcessItem(), new Error('RetryMaxError'), this.iterator.getCurrentCmd());
        // 다음 명령 수행
        this.nextCommand(false);
      }
    } else {
      commander.updateDcError(this.getProcessItem(), new Error('PrevCommand'), this.iterator.getCurrentCmd());
    }
  }


  /**
   * 현재 장비에 다음 명령을 예약함. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   * @param {commandFormat} cmdInfo 
   * @return {boolean} 명령 추가 성공시 true, 실패 시 throw
   */
  addCommand(cmdInfo) {
    // BU.CLIN(cmdInfo);
    // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
    if(_.isEmpty(this.deviceController.client)){
      // this.iterator.clearAllItem();
      throw new Error('Client is Disconnected.');
    } 
    // BU.log('addCommand');
    // BU.CLIN(cmdInfo);
    this.iterator.addCmd(cmdInfo);
    // BU.CLIN(this.commandStorage, 4);
    // 현재 진행 중인 명령이 없다면 즉시 해당 명령 실행
    if(_.isEmpty(this.commandStorage.process)){
      this.nextCommand(false);
    }
    return cmdInfo;
  }


  // /**
  //  * 현재 랭크 데이터 가져옴
  //  * @param {number} rank 
  //  */
  // getCommandStorageByRank(rank){
  //   return _.findWhere(this.commandStorage.rankList, {rank});
  // }


  /**
   * 다음 명령을 수행
   * @param {boolean=} hasForce 강제적으로 진행할 것인지
   */
  nextCommand(hasForce){
    // BU.debugConsole(5);
    // BU.CLI('nextCommand');
    // BU.CLIN(this.commandStorage, 2);
    // 현재 ProcessItem의 CmdList를 전부 수행하였을 경우
    if(this.iterator.isDone()){
      // BU.CLI('updateDcComplete');
      // 1:1 통신을 지속하고자 한다면 다음 명령을 수행하지 않음
      if(!hasForce && this.getProcessItem().commander.hasOneAndOne){
        // BU.CLI('OneAndOne 진행');
        // 명령이 존재하다면 
        return true;
      }
      this.getReceiver().updateDcComplete(this.getProcessItem());
    }
    
    this.retryChance = 3;

    // BU.CLIN(this.commandStorage, 4);
    let hasNext = this.iterator.nextCmd();
    // 다음 가져올 명령이 존재한다면
    if(hasNext){
      return this.requestWrite();
    } else {
      // BU.CLI('모든 명령을 수행하였습니다.');
    }
  }

  /** @return {commandFormat} */
  getProcessItem() {
    return this.iterator.getCurrentItem();
  }

  /** @return {AbstCommander} */
  getReceiver() {
    return this.iterator.getCurrentReceiver();
  }

  // getReceiver(): iterator.currItem().observer
  // getStatusCommand(): iterator.currItem()
  // addCommand(commandFormat): iterator.addCommand()
  // clearProcessCmd(): iterator.clear()

}

module.exports = Manager;