'use strict';

const _ = require('lodash');
const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('./AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('../device-manager/AbstManager');
const AbstDeviceClient = require('../device-client/AbstDeviceClient');

require('../format/define');
const {
  writeLogFile
} = require('../util/dcUtil');
const {
  definedCommandSetRank,
  definedOperationStatus,
  definedCommandSetMessage,
  definedCommanderResponse,
  definedControlEvent,
  definedOperationError
} = require('../format/moduleDefine');

const instanceList = [];

class Commander extends AbstCommander {
  /** @param {deviceClientConstructionInfo} config */
  constructor(config) {
    super();
    let foundInstance = _.find(instanceList, {
      id: config.target_id
    });
    if (_.isEmpty(foundInstance)) {
      this.config = config;
      this.id = config.target_id;
      this.category = config.target_category ? config.target_category : 'etc';
      // this.hasOneAndOne = config.hasOneAndOne ? true : false;
      // this.hasErrorHandling = config.hasErrorHandling ? true : false;
      this.controlInfo = config.controlInfo;
      /** Commander를 명령하는 Client 객체 */
      /** @type {AbstDeviceClient} */
      this.user = config.user || null;
      this.logOption = config.logOption;
      instanceList.push({
        id: config.target_id,
        instance: this
      });

      // BU.CLI(this);
    } else {
      throw new Error(`I have a device with the same id. ${config.target_id}`);
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


  /** Device Client에서 요청하는 부분 */

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  get hasConnectedDevice() {
    let hasDisConnected = _.chain(this.manager).get('deviceController.client').isEmpty().value();

    return !hasDisConnected;
  }

  /**
   * 장치로 명령을 내림
   * @param {commandSet} commandSet 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(commandSet) {
    try {
      // 오브젝트가 아니라면 자동으로 생성
      if (_.isObject(commandSet)) {
        // let findSetKeyList = ['cmdList', 'commander', 'commandId', 'hasOneAndOne', 'rank', 'currCmdIndex'];
        let findSetKeyList = ['cmdList', 'commander', 'commandId', 'rank', 'currCmdIndex'];

        let hasTypeCommandSet = _.eq(findSetKeyList.length, _.chain(commandSet).keys().intersection(findSetKeyList).value().length);
        if (hasTypeCommandSet) {
          return this.manager.addCommandSet(commandSet);
        } else {
          throw new Error('Please check the command format.');
        }
      } else {
        throw new Error('Please check the command format.');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 장치를 제어하는 실제 명령만을 가지고 요청할 경우
   * @param {Buffer|string|Object} cmd 자동완성 기능을 사용할 경우
   */
  generationAutoCommand(cmd) {
    /** @type {commandSet} */
    let commandSet = {};
    // commandSet 형식을 따르지 않을 경우 자동으로 구성
    commandSet.rank = definedCommandSetRank.SECOND;
    commandSet.commandId = null;
    commandSet.commandType = null;
    commandSet.commandName = null;
    commandSet.currCmdIndex = 0;
    commandSet.cmdList = [];
    // 자동 생성
    commandSet.operationStatus = definedOperationStatus.WAIT;
    commandSet.commander = this;
    // commandSet.hasOneAndOne = this.hasOneAndOne;
    // commandSet.hasErrorHandling = this.hasErrorHandling;
    commandSet.controlInfo = this.controlInfo;

    // 배열일 경우
    if (Array.isArray(cmd)) {
      cmd.forEach(cmd => {
        commandSet.cmdList.push({
          data: cmd,
          commandExecutionTimeoutMs: 1000
        });
      });
    } else if (cmd === undefined || cmd === null || cmd === '') {
      // 아무런 명령도 내리지 않음.
      commandSet.cmdList = [];
    } else {
      commandSet.cmdList.push({
        data: cmd,
        commandExecutionTimeoutMs: 1000
      });
    }

    // BU.CLI(commandSet);
    return commandSet;
  }

  /**
   * 명령 제어에 필요한 항목을 작성할 경우 사용
   * @param {requestCommandSet} commandSetInfo 자동완성 기능을 사용할 경우
   */
  generationManualCommand(commandSetInfo) {
    try {
      /** @type {commandSet} */
      let commandInfo = this.generationAutoCommand();

      _.forEach(commandSetInfo, (cmd, key) => {
        if (_.has(commandInfo, key)) {
          commandInfo[key] = cmd;
        } else {
          throw new Error('The requested key does not exist:' + key);
        }
      });

      commandInfo.cmdList = commandSetInfo.cmdList;
      // _.forEach(commandSetInfo.cmdList, cmdInfo => {
      //   if(_.has(cmdInfo, 'data') &&  _.has(cmdInfo, 'commandExecutionTimeoutMs')){
      //     commandInfo.cmdList.push(cmdInfo);
      //   } else {
      //     throw new Error('commandSetInfo 형식이 맞지 않습니다.');
      //   }
      // });

      // 자동 생성
      commandInfo.operationStatus = definedOperationStatus.WAIT;
      commandInfo.commander = this;
      // commandInfo.hasOneAndOne = this.hasOneAndOne;
      return commandInfo;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Commander와 연결된 장비에서 진행중인 저장소의 모든 명령을 가지고 옴 
   * @param {{commander: AbstCommander, commandId: string=}} searchInfo 
   * @return {commandStorage}
   */
  findCommandStorage(searchInfo) {
    try {
      return this.manager.findCommandStorage(searchInfo);
      // BU.CLIN(commandStorage, 3);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   */
  deleteCommandSet(commandId) {
    return this.manager.deleteCommandSet(commandId);
  }

  /**
   * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
   * @param {string} key 요청 key
   * 
   */
  requestTakeAction(key) {
    // BU.CLI('requestTakeAction', key);
    try {
      if (_.has(definedCommanderResponse, key)) {
        this.manager.requestTakeAction(this, key);
      } else {
        throw new Error(`${key} is not a valid control command.`);
      }
    } catch (error) {
      throw error;
    }
  }




  /* Device Controller에서 수신 --> 장치에서 일괄 이벤트 발생 */
  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   */
  updatedDcEventOnDevice(dcEvent) {
    switch (dcEvent.eventName) {
    case definedControlEvent.CONNECT:
      this._onSystemError('Disconnect', false);
      break;
    case definedControlEvent.DISCONNECT:
      this._onSystemError('Disconnect', true);
      break;
    default:
      break;
    }

    return this.user && this.user.updatedDcEventOnDevice(dcEvent);
  }

  /**
   * 실제 장치에서 보내온 Error 처리. Trouble Case Model List로 공통 처리
   * @param {string} troubleCode Trouble Code
   * @param {Boolean} hasOccur 발생 or 해결
   * @return {Object}
   */
  _onSystemError(troubleCode, hasOccur) {
    // BU.CLIS(this.systemErrorList, troubleCode, hasOccur, msg);
    if (troubleCode === undefined) {
      this.systemErrorList = [];
      return this.systemErrorList;
    }
    const troubleObj = _.find(troubleList, {
      code: troubleCode
    });
    if (_.isEmpty(troubleObj)) {
      throw ReferenceError('There is no such trouble message.' + troubleCode);
    }

    const findObj = _.find(this.systemErrorList, {
      code: troubleCode
    });
    // 에러가 발생하였고 systemErrorList에 없다면 삽입
    if (hasOccur && _.isEmpty(findObj)) {
      troubleObj.occur_date = new Date();
      this.systemErrorList.push(troubleObj);
    } else if (!hasOccur && !_.isEmpty(findObj)) { // 에러 해제하였고 해당 에러가 존재한다면 삭제
      this.systemErrorList = _.reject(this.systemErrorList, systemError => {
        return systemError.code === troubleCode;
      });
    }
    return this.systemErrorList;
  }




  /** Device Manager에서 Event 발생 */

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError) {
    // BU.CLIN(dcError );
    writeLogFile(this, 'config.logOption.hasDcError', 'error', _.get(dcError.errorInfo, 'message'),  _.get(dcError.errorInfo, 'stack'));

    return this.user && this.user.onDcError(dcError);
  }

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcMessage} dcMessage 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcMessage(dcMessage) {
    // BU.CLI(dcMessage);
    writeLogFile(this, 'config.logOption.hasDcMessage', 'message', dcMessage.msgCode, `commandId: ${_.get(dcMessage.commandSet, 'commandId')}`);
    return this.user && this.user.onDcMessage(dcMessage);
  }

  /**
   * 장치로부터 데이터 수신
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData) {
    return this.user && this.user.onDcData(dcData);
  }
}

module.exports = Commander;

// 시스템 에러는 2개로 정해둠.
let troubleList = [{
  code: 'Disconnect',
  msg: '장치 연결 해제'
}];