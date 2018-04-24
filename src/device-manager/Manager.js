'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('../device-commander/AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('./AbstManager');

const Iterator = require('./Iterator');

require('../format/define');
// DeviceManager는 DeviceController와 1:1 매칭.
const instanceList = [];
/** @class DeviceManager */
class Manager extends AbstManager {
  /** @param {deviceClientFormat} config */
  constructor(config) {
    super();
    this.config = config;
  }

  /** Manager를 초기화 처리 */
  setManager(){
    let config = this.config;
    let deviceController = null;
    let controller = null;

    switch (config.connect_info.type) {
    case 'serial':
      switch (config.connect_info.subType) {
      case 'parser':
        controller = require('../device-controller/serial/SerialWithParser');
        break;
      default:
        controller = require('../device-controller/serial/Serial');
        break;
      }
      break;
    case 'zigbee':
      switch (config.connect_info.subType) {
      case 'xbee':
        controller = require('../device-controller/zigbee/SerialWithXbee');
        break;
      default:
        break;
      }
      break;
    case 'socket':
      controller = require('../device-controller/socket/Socket');
      break;
    default:
      break;
    }

    if (_.isNull(controller)) {
      throw new Error('해당 장치는 없습니다.');
    } else {
      deviceController = new controller(config.connect_info);
    }
    // 해당 장치가 이미 존재하는지 체크
    let foundInstance = _.find(instanceList, { id: deviceController.id });
    // 장치가 존재하지 않는다면 instanceList에 삽입하고 deviceController에 등록
    if (_.isEmpty(foundInstance)) {
      // observer 등록
      deviceController.attach(this);
      // Manager에 Device 등록
      this.deviceController = deviceController;
      this.id = deviceController.id;
      // 신규 정의시 instanceList에 저장
      instanceList.push({ id: deviceController.id, instance: this });
    } else {  // singleton pattern
      return foundInstance.instance;
    }

    this.retryChance = 3; // 데이터 유효성 검사가 실패, 데이터 수신 에러가 있을 경우 3회까지 ProcessCmd 재전송
    /**
     * @type {commandStorage}
     */
    this.commandStorage = { processWork: {}, rankList: [], reservedList: []};

    this.createIterator();
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

  async write() {
    // BU.log('Device write');
    // BU.CLI(this.sendMsgTimeOutSec);
    const processItem = this.iterator.currentItem;
    // BU.CLI(processItem);
    if (_.isEmpty(processItem)) {
      throw new Error(`현재 진행중인 명령이 존재하지 않습니다. ${this.id}`);
    } else {
      let currCmd = this.iterator.currentCmd;

      // 명령 전송을 기다림
      await this.writeCommandController(currCmd);

      // BU.CLI('명령 요청', this.iterator.currentReceiver.id, processItem.timeoutMs);
      // console.time(`timeout ${testId}`);
      processItem.timer = setTimeout(() => {
        // console.timeEnd(`timeout ${testId}`);
        // Recevier가 빈 객체라면 Titmeout 메시지 보내지 않음.
        let receiver = this.iterator.currentReceiver;
        receiver == null ? '' : receiver.updateDcError(processItem, new Error('timeout'));
        this.nextCommand();
        // 명전 전송 후 제한시간안에 응답이 안올 경우 에러(기본 값 1초) 
      }, currCmd.timeoutMs || 1000);

      return true;
      // }
    }
  }

  /**
   * 장치로 명령 발송 --> 명령 수행 후 응답 결과 timeout 처리를 위함
   * @param {commandInfo} cmdInfo 
   * @return {Promise} 정상 처리라면 true, 아닐 경우 throw error
   */
  async writeCommandController(cmdInfo) {
    // BU.CLI('msgSendController');
    if (cmdInfo === '' || cmdInfo === undefined || cmdInfo === null|| BU.isEmpty(cmdInfo)) {
      // return new Error('수행할 명령이 없습니다.');
      return this.nextCommand();
    }
    // 장치로 명령 전송
    await this.deviceController.write(cmdInfo.data);
    return true;
  }


  /** write의 후속 결과 처리를 담당하는 컨트롤러 */
  requestWrite() {
    // BU.CLI(this.iterator.currentItem);
    let currCmd = this.iterator.currentCmd;
    BU.CLI('requestWrite', currCmd);
    // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
    if (_.isEmpty(this.deviceController.client)) {
      BU.log('DeviceController Client Is Empty');
      return false;
    } else if (currCmd === undefined) { // 현재 진행 할 명령이 없다면 다음 명령 요청
      return this.nextCommand();
    } else {
      // 명령 수행에 대기 시간이 존재한다면 해당 시간만큼 setTimer 가동 시킨 후 대기열로 이동
      if(currCmd.delayMs){
        return this.iterator.moveToReservedCmdList();
      } else {
        return this.write();
      }
    }
  }

  /**
   * updateData를 통해 전달받은 데이터에 대한 Commander의 응답을 받을 메소드
   * 응답받은 데이터에 문제가 있거나 다른 사유로 명령을 재 전송하고자 할 경우(3회까지 가능)
   * @param {AbstCommander} commander 
   * @param {string} msg 'isOk', 'retry'
   */
  responseToDataFromCommander(commander, msg) {
    // BU.CLI('responseToDataFromCommander');
    let processItem = this.iterator.currentItem;

    if (_.isEmpty(processItem)) {
      throw new Error('현재 진행중인 명령은 없습니다.');
    }

    // 현재 진행중인 명령 객체와 일치해야지만 가능
    if (_.isEqual(processItem.commander, commander)) {
      switch (msg) {
      case 'isOk':
        BU.CLI('isOk', this.iterator.currentReceiver.id);
        // BU.CLIN(this.iterator.currentItem.timer);
        clearTimeout(this.iterator.currentItem.timer);
        // BU.CLIN(this.iterator.currentItem.timer);
        // console.timeEnd('gogogo');
        this.nextCommand();
        break;
      case 'retry':
        clearTimeout(this.iterator.currentItem.timer);
        this.retryWrite();
        break;
      default:
        break;
      }
    } else {
      throw new Error('현재 진행중인 명령의 Commander와 일치하지 않습니다.');
    }
  }

  retryWrite() {
    BU.CLI('retryWrite');
    this.retryChance -= 1;
    // 명령을 재요청할 경우 진행중인 timeout 처리는 해제

    if (this.retryChance > 0) {
      return Promise.delay(30).then(() => {
        this.requestWrite();
      });
    } else if (this.retryChance === 0) {  // 3번 재도전 실패시 다음 명령 수행
      // 해당 에러 발송
      BU.CLI('retryWrite Max Error');
      this.iterator.currentReceiver.updateDcError(this.iterator.currentItem, new Error('retryMaxError'));
      // 다음 명령 수행
      this.nextCommand();
    }
  }

  /**
   * @param {commandFormat} cmdInfo 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  addCommand(cmdInfo) {
    // BU.CLIN(cmdInfo);
    // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
    // BU.CLI(this.deviceController.client);
    if (_.isEmpty(this.deviceController.client)) {
      return false;
    }
    // BU.log('addCommand');
    // BU.CLIN(cmdInfo);
    this.iterator.addCmd(cmdInfo);
    // BU.CLI(this.commandStorage);
    // 현재 진행 중인 명령이 없다면 즉시 해당 명령 실행
    if (_.isEmpty(this.commandStorage.processWork)) {
      this.nextCommand();
    }
    return true;
  }

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {commandStorage}
   */
  deleteCommand(commandId){
    let hasDeleteCurrCmd = this.iterator.deleteCmd(commandId);
    BU.CLI('hasDeleteCurrCmd', hasDeleteCurrCmd);
    if(hasDeleteCurrCmd){
      this.nextCommand();
    }
    return this.iterator.allItem;
  }


  /**
   * 현재 랭크 데이터 가져옴
   * @param {number} rank 
   */
  getCommandStorageByRank(rank) {
    return _.find(this.commandStorage.rankList, { rank });
  }

  /**
   * 다음 명령을 수행
   * @param {AbstCommander=} commander 
   */
  nextCommand() {
    BU.CLI('nextCommand');
    // BU.CLI(this.commandStorage);
    
    let currProcessCmdInfo = this.iterator.currentItem;
    // BU.CLIN(currProcessCmdInfo);
    let nextRank = this.iterator.nextRank;
    // BU.CLI(nextRank);
    let currCmd = this.iterator.currentCmd;
    // BU.CLI(currCmd);
    // 현재 아무런 명령이 존재하지 않을 경우
    if(_.isEmpty(currProcessCmdInfo)){
      // 다음 명령 집합이 있다면 
      if(nextRank !== undefined){
        // 명령 집합 이동 
        this.iterator.changeNextRank(nextRank);
        // 현재 수행할 명령 요청
        return this.requestWrite();
      } 
    } else if(currCmd === undefined || this.iterator.isDone()) { // 현재 진행한 명령, 다음 명령이 존재하지 않는다면 해당 명령의 수행을 완료한 것으로 처리
      let receiver = this.iterator.currentReceiver;
      // 1:1로 명령을 물고 가는 경우에는 Next 진행하지 않음
      if(currProcessCmdInfo.hasOneAndOne){
        return receiver == null ? '' : receiver.updateDcEvent('oneAndOne Comunication Done', this.iterator.currentItem);
      } else {  // 명령 객체 수행 완료 보고
        receiver == null ? '' : receiver.updateDcComplete(currProcessCmdInfo);
        // 다음 명령 집합이 있다면 
        if(nextRank !== undefined){
          // 명령 집합 이동 
          this.iterator.changeNextRank(nextRank);
          // BU.CLI(this.iterator.currentItem.rank);
          // 현재 수행할 명령 요청
          return this.requestWrite();
        }
      }
    } else {  // 다음 명령이 존재할 경우
      this.retryChance = 3;
      let hasNext = this.iterator.changeNextCmd();
  
      // 다음 가져올 명령이 존재한다면
      if (hasNext) {
        return this.requestWrite();
      } 
    }
    // 
    this.iterator.clearProcessItem();
    // BU.CLIN(this.commandStorage, 5);
    BU.CLI('모든 명령을 수행하였습니다.');
  }
}

module.exports = Manager;