'use strict';

const _ = require('underscore');
const uuidv4 = require('uuid/v4');

const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('./AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('../device-manager/AbstManager');
const AbstDeviceClient = require('../device-client/AbstDeviceClient');

require('../format/define');

const instanceList = [];

class Commander extends AbstCommander {
  /** @param {deviceClientFormat} config */
  constructor(config) {
    super();
    let foundInstance = _.findWhere(instanceList, {id: config.target_id});
    if(_.isEmpty(foundInstance)){
      this.id = config.target_id;
      this.category = config.target_category ? config.target_category : 'etc';
      this.hasOneAndOne = config.hasOneAndOne ? true : false;
      /** Commander를 명령하는 Client 객체 */
      /** @type {AbstDeviceClient} */
      this.user = config.user === null ? null : config.user;
      instanceList.push({id: config.target_id, instance: this});
    } else {
      throw new Error(`같은 ID를 가진 장치가 있습니다.${config.target_id}`);
      // return foundInstance.instance;
    }

    /** @type {AbstManager} */
    this.manager;

    /** 
     * 현재 발생되고 있는 시스템 에러 리스트
     * @type {Array.<{deviceError}>} 
     * */
    this.systemErrorList = [];

    this.currCmd = null;
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

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  get hasConnectedDevice(){
    return _.isEmpty(this.mediator.getDeviceManager().deviceController.client) ? false : true;
  }

  /* Client가 요청 */
  /**
   * 장치로 명령을 내림
   * 아무런 명령을 내리지 않을 경우 해당 장치와의 연결고리를 끊지 않는다고 판단
   * 명시적으로 hasOneAndOne을 True로 줄 해당 명령 리스트를 모두 수행하고 다음 CommandFormat으로 이동하지 않음
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
    commandInfo.commander = this;
    commandInfo.cmdList = [];
    commandInfo.currCmdIndex = 0;
    
    commandInfo.timeoutMs = 1000;

    if(Buffer.isBuffer(cmdInfo) || typeof cmdInfo  === 'string' ){
      // 아무런 명령을 내리지 않는다면 해당 장치와의 통신을 끊지 않는다고 봄
      commandInfo.cmdList = [cmdInfo];
    } else if (Array.isArray(cmdInfo)) {
      commandInfo.cmdList = cmdInfo;
    } else {
      _.each(commandInfo, (info, key) => {
        commandInfo[key] = _.has(cmdInfo, key) ? cmdInfo[key] : commandInfo[key];
      });
      // 이상한 옵션을 걸 경우 정상적인 데이터로 초기화
      commandInfo.commander = this;
      commandInfo.currCmdIndex = commandInfo.currCmdIndex < 0 ? 0 : commandInfo.currCmdIndex;
      commandInfo.timeoutMs = commandInfo.timeoutMs <= 0 ? 1000 : commandInfo.timeoutMs;
    }

    // BU.CLIN(commandInfo);

    return this.mediator.requestAddCommand(commandInfo, this);
  }


  /**
   * Commander와 연결된 장비에서 진행중인 저장소의 모든 명령을 가지고 옴 
   * @return {commandStorage}
   */
  getCommandStorage() {
    try {
      const commandStorage = this.mediator.getCommandStorage(this);
      return commandStorage;
      // BU.CLIN(commandStorage, 3);
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
    // this.manager = {};

    switch (eventName) {
    case 'dcConnect':
      this.onSystemError('Disconnected', false);
      break;
    case 'dcClose':
      this.onSystemError('Disconnected', true);
      break;
    default:
      this.loggingData(eventName, eventMsg);
      break;
    }

    if(this.user){
      this.user.updateDcEvent(eventName, eventMsg);
    }
  }


  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   * @param {Error} error 현재 장비에서 실행되고 있는 명령 객체
   * @param {*} errMessage 
   */
  updateDcError(processItem, error, errMessage){
    // BU.log(`updateDcError ${error}\t`, errStack);
    // BU.CLI('에러 수신');
    // 1:1로 장비를 계속 물고 갈 경우 에러 무시
    // if(this.hasOneAndOne !== true){
    //   BU.CLI('에러 수신해서 처리');
    //   this.manager = {};
  
    // BU.CLIS(error, errMessage);
    if(error.message === 'Timeout'){
      this.onSystemError('Timeout', true, errMessage);
    } else {
      this.loggingData(error, errMessage);
    }
    // }

    if(this.user){
      this.user.updateDcError(processItem, error, errMessage);
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
    // BU.CLI(data.toString());

    // BU.CLIN(this.manager, 2);
    this.onSystemError('Timeout', false);
    // this.manager = manager;

    // 데이터를 받은 시점에서 DeviceManager가 전송한 명령을 저장. 차후 Manager로 requestNext나 requestTry를 진행할 경우 Manager에서 이 currCmd를 체크함
    let currCmd = processItem.cmdList[processItem.currCmdIndex];
    this.currCmd = typeof currCmd === 'object' ? JSON.parse(JSON.stringify(currCmd)) : currCmd;
    
    if(this.user){
      this.user.updateDcData(processItem, data);
    }
  }

  /** Manager에게 다음 명령을 수행하도록 요청 */
  requestNextCommand(){
    BU.CLI(`requestNextCommand ${this.id}`);
    try {
      this.manager.responseToDataFromCommander(this, 'next');
    } catch (error) {
      throw error;
    }
  }

  /** Manager에게 현재 실행중인 명령을 재 전송하도록 요청 */
  requestRetryCommand(){
    BU.CLI('requestRetryCommand', this.id);
    try {
      this.manager.responseToDataFromCommander(this, 'retry');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
   * @param {string} key 요청 key
   */
  requestTakeAction(key){
    BU.CLI('requestRetryCommand', this.id);
    try {
      this.manager.responseToDataFromCommander(this, key);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 명령 객체 리스트 수행 종료
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   */
  updateDcComplete(processItem) {
    // BU.CLI('모든 명령이 수행 되었다고 수신 받음.', this.id);
    if(this.user){
      return this.user.updateDcComplete(processItem);
    }
  }

  /**
   * 실제 장치에서 보내온 Error 처리. Trouble Case Model List로 공통 처리
   * @param {string} errName Trouble Code
   * @param {Object|string} errMessage Error 상세 내용
   * @return {Object}
   */
  loggingData(errName, errMessage) {
    BU.appendFile(`${process.cwd()}/log/${this.category}/event/${BU.convertDateToText(new Date(), '', 2)}.txt`, `ID: ${this.id}\t Code: ${errName}\tMessage: ${errMessage}`);
    return true;
  }

  /**
   * 실제 장치에서 보내온 Error 처리. Trouble Case Model List로 공통 처리
   * @param {string} troubleCode Trouble Code
   * @param {Boolean} hasOccur 발생 or 해결
   * @param {Object|string} msg Error 상세 내용
   * @return {Object}
   */
  onSystemError(troubleCode, hasOccur, msg) {
    // BU.CLIS(this.systemErrorList, troubleCode, hasOccur, msg);
    if (troubleCode === undefined) {
      this.systemErrorList = [];
      return this.systemErrorList;
    }
    const troubleObj = _.findWhere(troubleList, {
      code: troubleCode
    });
    if (_.isEmpty(troubleObj)) {
      throw ReferenceError('해당 Trouble Msg는 없습니다' + troubleCode);
    }

    const findObj = _.findWhere(this.systemErrorList, {
      code: troubleCode
    });
    // 에러가 발생하였고 systemErrorList에 없다면 삽입
    if (hasOccur && _.isEmpty(findObj)) {
      troubleObj.occur_date = new Date();
      this.systemErrorList.push(troubleObj);

      this.loggingData(`이상 발생 code:${troubleCode}`, msg);
    } else if (!hasOccur && !_.isEmpty(findObj)) {  // 에러 해제하였고 해당 에러가 존재한다면 삭제
      this.systemErrorList = _.reject(this.systemErrorList, systemError => {
        if(systemError.code === troubleCode){
          this.loggingData(`이상 해제 code:${troubleCode}`, msg);
          return true;
        }
      });
    }
    return this.systemErrorList;
  }


}

module.exports = Commander;

// 시스템 에러는 2개로 정해둠.
let troubleList = [{
  code: 'Disconnected',
  msg: '장치 연결 해제'
}, {
  code: 'Timeout',
  msg: '통신 이상'
}, ];