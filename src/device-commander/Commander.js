'use strict';

const _ = require('underscore');
const uuidv4 = require('uuid/v4');

const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('./AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('../device-manager/AbstManager');
const AbstDeviceClient = require('../client/AbstDeviceClient');

require('../format/define');

const instanceList = [];

class Commander extends AbstCommander {
  /** @param {deviceClientFormat} config */
  constructor(config) {
    super();
    let foundInstance = _.findWhere(instanceList, {id: config.target_id});
    if(_.isEmpty(foundInstance)){
      this.id = config.target_id;
      /** Commander를 명령하는 Client 객체 */
      /** @type {AbstDeviceClient} */
      BU.CLIN(config.observer);
      this.observer = config.observer === null ? null : config.observer;
      instanceList.push({id: config.target_id, instance: this});
    } else {
      throw new Error(`같은 ID를 가진 장치가 있습니다.${config.target_id}`);
      // return foundInstance.instance;
    }

    /** @type {AbstManager} */
    this.manager;
    
    // this.once = true;
  }

  /* Mediator에서 Set 함 */
  /**
   * deviceMediator 을 정의
   * @param {AbstMediator} deviceMediator 
   * @return {undefined}
   */
  setMediator(deviceMediator) {
    this.mediator = deviceMediator;
  }

  // getConnectedDeviceStatus(){
  //   if(_.isEmpty(this.deviceController.client)){

  //   }

  // }


  /* Client가 요청 */
  /**
   * 장치로 명령을 내림
   * 아무런 명령을 내리지 않을 경우 해당 장치와의 연결고리를 끊지 않는다고 판단
   * 명시적으로 hasOneAndOne을 True로 줄 경우 주어진 첫번째 명령을 발송
   * @param {Buffer|string|commandFormat|null} cmdInfo 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(cmdInfo){
    /** @type {commandFormat} */
    let commandInfo = {};
    // commandFormat 형식을 따르지 않을 경우 자동으로 구성
    commandInfo.rank = 2;
    commandInfo.name = this.id;
    commandInfo.uuid = uuidv4();
    commandInfo.hasOneAndOne = false;
    commandInfo.commander = this;
    commandInfo.cmdList = [];
    commandInfo.currCmdIndex = 0;
    commandInfo.hasOneAndOne = false;
    
    commandInfo.timeoutMs = 1000;

    if(Buffer.isBuffer(cmdInfo) || typeof cmdInfo  === 'string' ){
      BU.CLI('왓더');
      // 아무런 명령을 내리지 않는다면 해당 장치와의 통신을 끊지 않는다고 봄
      if(cmdInfo.length === 0){
        BU.CLI('왓더');
        commandInfo.cmdList = [''];
        commandInfo.hasOneAndOne = true;
      } else {
        commandInfo.cmdList = [cmdInfo];
      }
    } else {
      _.each(commandInfo, (info, key) => {
        commandInfo[key] = _.has(cmdInfo, key) ? cmdInfo[key] : commandInfo[key];
      });
      // 이상한 옵션을 걸 경우 정상적인 데이터로 초기화
      commandInfo.commander = this;
      commandInfo.currCmdIndex = commandInfo.currCmdIndex < 0 ? 0 : commandInfo.currCmdIndex;
      commandInfo.timeoutMs = commandInfo.timeoutMs <= 0 ? 1000 : commandInfo.timeoutMs;
    }

    BU.CLIN(commandInfo);

    return this.mediator.requestAddCommand(commandInfo, this);
  }


  /**
   * Commander와 연결된 장비에서 진행중인 저장소의 모든 명령을 가지고 옴 
   */
  getCommandStatus() {
    try {
      const commandStorage = this.mediator.getCommandStorage(this);
      BU.CLIN(commandStorage, 3);
    } catch (error) {
      throw error;
    }
  }

  /* 장치에서 일괄 이벤트 발생 */
  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @param {string} eventName 'dcConnect', 'dcClose', 'dcError'
   * @param {*=} eventMsg 
   * @return {undefined}
   */
  updateDcEvent(eventName, eventMsg) {
    // BU.log(`updateDcEvent ${this.id}\t`, eventName);
    this.manager = {};

    if(this.observer){
      this.observer.updateDcEvent(eventName, eventMsg);
    }
  }


  /** 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트 */
  /**
   * 장치에서 에러가 발생하였을 경우
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   * @param {Error} err 
   */
  updateDcError(processItem, err){
    // BU.log(`updateDcError ${this.id}\t`, processItem, err);
    this.manager = {};
    if(this.observer){
      this.observer.updateDcError(processItem, err);
    }
  }

  // TODO Converter 붙이거나 세분화 작업, 예외 처리 필요
  /**
   * 장치로부터 데이터 수신
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   * @param {Buffer} data 명령 수행 결과 데이터
   * @param {AbstManager} manager 장치 관리 매니저
   */
  updateDcData(processItem, data, manager){
    // console.time('gogogo');
    BU.log(data.toString());
    this.manager = manager;
    
    if(this.observer){
      this.observer.updateDcData(processItem, data);
    }
  }

  /** Manager에게 다음 명령을 수행하도록 요청 */
  requestNextCommand(){
    BU.CLI(`requestNextCommand ${this.id}`);
    if(_.isEmpty(this.manager)){
      throw new Error(`Manager의 현재 수행명령이 현재 Commander ${this.id}와 관련이 없습니다.`);
    }

    const manager = this.manager;
    this.manager = {};

    manager.responseToDataFromCommander(this, 'isOk');
  }

  /** Manager에게 현재 실행중인 명령을 재 전송하도록 요청 */
  requestRetryCommand(){
    BU.CLI('requestRetryCommand', this.id);
    // BU.CLIN(this.manager);
    if(_.isEmpty(this.manager)){
      throw new Error(`Manager의 현재 수행명령이 현재 Commander ${this.id}와 관련이 없습니다.`);
    }

    const manager = this.manager;
    this.manager = {};

    manager.responseToDataFromCommander(this, 'retry');
  }



  
  /**
   * 명령 객체 리스트 수행 종료
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   */
  updateDcComplete(processItem) {
    // BU.CLI('모든 명령이 수행 되었다고 수신 받음.', this.id);
    if(this.observer){
      return this.observer.updateDcComplete(processItem);
    }
  }
}

module.exports = Commander;