'use strict';

const _ = require('lodash');
const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('./AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('../device-manager/AbstManager');
const AbstDeviceClient = require('../device-client/AbstDeviceClient');

require('../format/define');

const instanceList = [];

class Commander extends AbstCommander {
  /** @param {deviceClientConstructionInfo} config */
  constructor(config) {
    super();
    let foundInstance = _.find(instanceList, {
      id: config.target_id
    });
    if (_.isEmpty(foundInstance)) {
      this.id = config.target_id;
      this.category = config.target_category ? config.target_category : 'etc';
      this.hasOneAndOne = config.hasOneAndOne ? true : false;
      /** Commander를 명령하는 Client 객체 */
      /** @type {AbstDeviceClient} */
      this.user = config.user === null ? null : config.user;
      instanceList.push({
        id: config.target_id,
        instance: this
      });

      // BU.CLI(this);
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
  get hasConnectedDevice() {
    return _.isEmpty(this.mediator.getDeviceManager().deviceController.client) ? false : true;
  }

  /* Client가 요청 */
  /**
   * 장치로 명령을 내림
   * 아무런 명령을 내리지 않을 경우 해당 장치와의 연결고리를 끊지 않는다고 판단
   * 명시적으로 hasOneAndOne을 True로 줄 해당 명령 리스트를 모두 수행하고 다음 CommandFormat으로 이동하지 않음
   * @param {Buffer|string|commandSet|null} cmdInfo 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(cmdInfo) {
    /** @type {commandSet} */
    let commandInfo = {};
    // commandSet 형식을 따르지 않을 경우 자동으로 구성
    commandInfo.rank = 2;
    commandInfo.commandId = null;
    
    commandInfo.commander = this;
    commandInfo.currCmdIndex = 0;
    commandInfo.cmdList = [];

    if (Buffer.isBuffer(cmdInfo) || typeof cmdInfo === 'string') {
      // 아무런 명령을 내리지 않는다면 해당 장치와의 통신을 끊지 않는다고 봄
      commandInfo.cmdList = [cmdInfo];
    } else if (Array.isArray(cmdInfo)) {
      commandInfo.cmdList = cmdInfo;
    } else {
      _.forEach(commandInfo, (info, key) => {
        commandInfo[key] = _.has(cmdInfo, key) ? cmdInfo[key] : commandInfo[key];
      });
      // 이상한 옵션을 걸 경우 정상적인 데이터로 초기화
      commandInfo.currCmdIndex = commandInfo.currCmdIndex < 0 ? 0 : commandInfo.currCmdIndex;
      commandInfo.commandExecutionTimeoutMs = commandInfo.commandExecutionTimeoutMs <= 0 ? 1000 : commandInfo.commandExecutionTimeoutMs;
    }
    // 해당 Commander 생성 객체의 옵션을 가져옴
    commandInfo.hasOneAndOne = this.hasOneAndOne;
    // BU.CLIN(commandInfo);

    return this.mediator.requestAddCommandSet(commandInfo, this);
  }

  /**
   * 장치를 제어하는 실제 명령만을 가지고 요청할 경우
   * @param {Buffer|string|undefined} cmdInfo 자동완성 기능을 사용할 경우
   */
  executeAutoCommand(cmdInfo) {
    /** @type {commandSet} */
    let commandInfo = {};
    // commandSet 형식을 따르지 않을 경우 자동으로 구성
    commandInfo.rank = 2;
    commandInfo.commandId = null;
    commandInfo.currCmdIndex = 0;
    commandInfo.cmdList = [];
    // 자동 생성
    commandInfo.operationStatus = 0;
    commandInfo.commander = this;
    commandInfo.hasOneAndOne = this.hasOneAndOne;

    // 배열일 경우
    if (Array.isArray(cmdInfo)) {
      cmdInfo.forEach(cmd => {
        commandInfo.cmdList.push({
          data: cmd,
          timoutMs: 1000
        });
      });
    } else if (cmdInfo === undefined || cmdInfo === null || cmdInfo === '') {
      // 아무런 명령도 내리지 않음.
      commandInfo.cmdList = [];
    } else {
      commandInfo.cmdList.push({
        data: cmdInfo,
        timoutMs: 1000
      });
    }

    return this.mediator.requestAddCommandSet(commandInfo, this);
  }

  /**
   * 명령 제어에 필요한 항목을 작성할 경우 사용
   * @param {requestCommandSet} cmdInfo 자동완성 기능을 사용할 경우
   */
  executeManualCommand(cmdInfo) {
    /** @type {commandSet} */
    let commandInfo = this.executeAutoCommand();

    _.forEach(cmdInfo, (cmd, key) => {
      commandInfo[key] = cmd;
    });

    // 자동 생성
    commandInfo.operationStatus = 0;
    commandInfo.commander = this;
    commandInfo.hasOneAndOne = this.hasOneAndOne;
    return this.mediator.requestAddCommandSet(commandInfo, this);
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
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   */
  updatedDcEventOnDevice(dcEvent) {
    // BU.log(`updatedDcEventOnDevice ${this.id}\t`, eventName);
    // this.manager = {};

    switch (dcEvent.eventName) {
    case 'dcConnect':
      this.onSystemError('Disconnected', false);
      break;
    case 'dcClose':
      this.onSystemError('Disconnected', true);
      break;
    default:
      this.loggingData(dcEvent.eventName, dcEvent.eventMsg);
      break;
    }

    if (this.user) {
      this.user.updatedDcEventOnDevice(dcEvent);
    }
  }


  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError){
    // BU.log(`onDcError ${error}\t`, errStack);
    if (dcError.errorInfo.message === 'Timeout') {
      this.onSystemError('Timeout', true, dcError.errorInfo);
    } else {
      this.loggingData(dcError.errorName, dcError.errorInfo);
    }

    if (this.user) {
      this.user.onDcError(dcError);
    }
  }

  // TODO Converter 붙이거나 세분화 작업, 예외 처리 필요
  /**
   * 장치로부터 데이터 수신
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData){
    // console.time('gogogo');
    this.onSystemError('Timeout', false);
    // this.manager = manager;

    if (this.user) {
      this.user.onDcData(dcData);
    }
  }

  /** Manager에게 다음 명령을 수행하도록 요청 */
  requestNextCommand() {
    BU.CLI(`requestNextCommand ${this.id}`);
    try {
      this.manager.responseToDataFromCommander(this, 'next');
    } catch (error) {
      throw error;
    }
  }

  /** Manager에게 현재 실행중인 명령을 재 전송하도록 요청 */
  requestRetryCommand() {
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
  requestTakeAction(key) {
    BU.CLI('requestRetryCommand', this.id);
    try {
      this.manager.responseToDataFromCommander(this, key);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 명령 객체 리스트 수행 종료
   * @param {commandSet} processItem 현재 장비에서 실행되고 있는 명령 객체
   */
  updatedDcCompleteCommandExecution(processItem) {
    // BU.CLI('모든 명령이 수행 되었다고 수신 받음.', this.id);
    if (this.user) {
      return this.user.updatedDcCompleteCommandExecution(processItem);
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
    const troubleObj = _.find(troubleList, {
      code: troubleCode
    });
    if (_.isEmpty(troubleObj)) {
      throw ReferenceError('해당 Trouble Msg는 없습니다' + troubleCode);
    }

    const findObj = _.find(this.systemErrorList, {
      code: troubleCode
    });
    // 에러가 발생하였고 systemErrorList에 없다면 삽입
    if (hasOccur && _.isEmpty(findObj)) {
      troubleObj.occur_date = new Date();
      this.systemErrorList.push(troubleObj);

      this.loggingData(`이상 발생 code:${troubleCode}`, msg);
    } else if (!hasOccur && !_.isEmpty(findObj)) { // 에러 해제하였고 해당 에러가 존재한다면 삭제
      this.systemErrorList = _.reject(this.systemErrorList, systemError => {
        if (systemError.code === troubleCode) {
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