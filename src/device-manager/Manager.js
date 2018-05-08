'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const {
  BU,
  CU
} = require('base-util-jh');

const AbstCommander = require('../device-commander/AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstController = require('../device-controller/AbstController');
const AbstManager = require('./AbstManager');

const Iterator = require('./Iterator');

const {
  definedOperationStatus,
  definedCommandSetMessage,
  definedCommanderResponse
} = require('../format/moduleDefine');

const {
  writeLogFile
} = require('../util/dcUtil');

require('../format/define');
// DeviceManager는 DeviceController와 1:1 매칭.
const instanceList = [];
/** @class DeviceManager */
class Manager extends AbstManager {
  constructor() {
    super();

  }

  /** Manager를 초기화 처리 */
  /** @param {deviceClientConstructionInfo} config */

  /** Builder에서 요청 메소드 */
  setManager(config) {
    /** @type {AbstController} */
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
      deviceController = new controller(config, config.connect_info);
    }
    // Controller의 접속 정보를 ID로 함
    this.id = deviceController.configInfo;

    // 해당 장치가 이미 존재하는지 체크
    let foundInstance = _.find(instanceList, instanceInfo => {
      return _.isEqual(instanceInfo.id, this.id);
    });
    // 장치가 존재하지 않는다면 instanceList에 삽입하고 deviceController에 등록
    if (_.isEmpty(foundInstance)) {
      // observer 등록
      deviceController.attach(this);
      this.config = config;
      this.hasPerformCommand = false;
      // Manager에 Device 등록
      this.deviceController = deviceController;
      // BU.CLI('@@@@@@@@@@@', this.id);
      // 신규 정의시 instanceList에 저장
      instanceList.push({
        id: this.id,
        instance: this
      });
      this.retryChance = 3; // 데이터 유효성 검사가 실패, 데이터 수신 에러가 있을 경우 3회까지 ProcessCmd 재전송
      /**
       * @type {commandStorage}
       */
      this.commandStorage = {};
  
      this.createIterator();
  
      return this;
    } else { // singleton pattern
      return foundInstance.instance;
    }
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




  /** Commander로부터 요청 */
  /**
   * updateData를 통해 전달받은 데이터에 대한 Commander의 응답을 받을 메소드
   * 응답받은 데이터에 문제가 있거나 다른 사유로 명령을 재 전송하고자 할 경우(3회까지 가능)
   * @param {AbstCommander} commander 
   * @param {string} commanderResponse 
   */
  requestTakeAction(commander, commanderResponse) {
    // BU.CLI('responseToDataFromCommander');
    let currentCommandSet = this.iterator.currentCommandSet;

    if (_.isEmpty(currentCommandSet)) {
      throw new Error('현재 진행중인 명령은 없습니다.');
    }

    // 현재 진행중인 명령 객체와 일치해야지만 가능
    if (_.isEqual(currentCommandSet.commander, commander)) {
      writeLogFile(this, 'config.logOption.hasCommanderResponse', 'data', 'commanderResponse', commanderResponse);

      switch (commanderResponse) {
      case definedCommanderResponse.DONE:
        // BU.CLI('isOk', this.iterator.currentReceiver.id);
        // 타이머가 붙어있다면 타이머 해제
        currentCommandSet.commandExecutionTimer && currentCommandSet.commandExecutionTimer.pause();
        this.updateOperationStatus(definedOperationStatus.RECEIVE_DATA_DONE);
        this.manageProcessingCommand();
        break;
        // 데이터의 수신은 이루어졌으나 더 많은 데이터가 필요하니 기달려라
      case definedCommanderResponse.WAIT:
        // BU.CLI('definedCommanderResponse.WAIT');
        this.updateOperationStatus(definedOperationStatus.RECEIVE_WAIT_MORE_DATA);
        break;
        // 다음 명령을 수행해라 (강제)
      case definedCommanderResponse.NEXT:
        // BU.CLI('definedCommanderResponse.NEXT');
        this.updateOperationStatus(definedOperationStatus.RECEIVE_NEXT_FORCE);
        this.manageProcessingCommand();
        break;
        // 명령을 재전송 해달라
      case definedCommanderResponse.RETRY:
        // BU.CLI('definedCommanderResponse.RETRY', this.iterator.currentReceiver.id);
        // 타이머가 붙어있다면 타이머 해제
        currentCommandSet.commandExecutionTimer && currentCommandSet.commandExecutionTimer.pause();
        this.retryRequestProcessingCommand();
        break;
      default:
        break;
      }
    } else {
      throw new Error('현재 진행중인 명령의 Commander와 일치하지 않습니다.');
    }
  }

  /**
   * @param {commandSet} commandSet 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  addCommandSet(commandSet) {

    // BU.CLIN(cmdInfo);
    // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
    if (_.isEmpty(this.deviceController.client)) {
      throw new Error('Device Controller가 연결되지 않았습니다.');
    }
    this.iterator.addCmd(commandSet);
    return this.manageProcessingCommand();
    // return false;
  }

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {commandStorage}
   */
  deleteCommandSet(commandId) {
    this.iterator.deleteCmd(commandId);
    this.manageProcessingCommand();
  }

  /**
   * 찾고자 하는 정보 AND 연산 
   * @param {{commander: AbstCommander, commandId: string=}} searchInfo 
   * @return {commandStorage}
   */
  findCommandStorage(searchInfo) {
    return this.iterator.findCommandStorage(searchInfo);
  }


  /** AbstManager Implement */
  /**
   * 장치에서 데이터가 수신되었을 경우 해당 장치의 데이터를 수신할 Commander에게 전송
   * @param {*} data 
   */
  onData(data) {
    // this.iterator.currentReceiver && 
    // 데이터 수신이 이루어지고 해당 데이터에 대한 Commander의 응답을 기다리는 중
    this.updateOperationStatus(definedOperationStatus.RECEIVE_WAIT_PROCESSING_DATA);
    writeLogFile(this, 'config.logOption.hasReceiveData', 'data', 'onData', data);

    let receiver = this.iterator.currentReceiver;
    // BU.CLI(receiver);
    if (receiver === null) {
      BU.log('Not set Responder --> Completed Data', data);
    } else {
      /** @type {dcData} */
      const returnValue = {
        data,
        commandSet: this.iterator.currentCommandSet,
        spreader: this
      };
      receiver.onDcData(returnValue);
    }
  }



  /** 명령 관리 제어 메소드 */
  /**
   * @private
   * 실제로 연결된 장치에 명령을 요청하는 메소드
   * 명령의 전송 가능 여부 체크는 requestProcessingCommand() 메소드에서 수행하므로 별도로 체크하지 않음
   * 명령 전송 실패 에러가 발생할 경우 requestProcessingCommand()로 이동
   */
  async transferCommandToDevice() {
    // BU.log('Device write');
    // BU.CLI(this.sendMsgTimeOutSec);
    const currentCommandSet = this.iterator.currentCommandSet;
    // BU.CLI(processItem);
    let currentCommand = this.iterator.currentCommand;

    // 명령 전송을 기다림
    this.updateOperationStatus(definedOperationStatus.REQUEST_CMD);

    // BU.CLIN(currentCommand.data, currentCommand.commandExecutionTimeoutMs);
    writeLogFile(this, 'config.logOption.hasTransferCommand', 'data', 'transferData', currentCommand.data);

    await this.deviceController.write(currentCommand.data);
    // 명령 전송이 성공하였으므로 데이터 수신 상태로 변경
    this.updateOperationStatus(definedOperationStatus.RECEIVE_WAIT_DATA);

    // BU.CLI('명령 요청', this.iterator.currentReceiver.id, processItem.commandExecutionTimeoutMs);
    // console.time(`timeout ${testId}`);
    currentCommandSet.commandExecutionTimer = new CU.Timer(() => {
      switch (currentCommandSet.operationStatus) {
      case definedOperationStatus.REQUEST_CMD:
      case definedOperationStatus.RECEIVE_WAIT_DATA:
        this.updateOperationStatus(definedOperationStatus.E_TIMEOUT);
        break;
      case definedOperationStatus.RECEIVE_WAIT_PROCESSING_DATA:
        this.updateOperationStatus(definedOperationStatus.E_UNHANDLING_DATA);
        break;
      case definedOperationStatus.RECEIVE_WAIT_MORE_DATA:
        this.updateOperationStatus(definedOperationStatus.E_DATA_PART);
        break;
      default:
        this.updateOperationStatus(definedOperationStatus.E_UNEXPECTED);
        break;
      }
      return this.manageProcessingCommand();
    }, currentCommand.commandExecutionTimeoutMs || 1000);
  }

  /**
   * @private 현재 명령의 상태에 따라 명령 처리
   * 1. Disconnected Device
   * 2. Non Command
   * 3. Transfer Command To Device
   * 4. Unexpected Exception
   */
  requestProcessingCommand() {
    try {
      let currentCommand = this.iterator.currentCommand;
      // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
      // TODO
      if (_.isEmpty(this.deviceController.client)) {
        this.updateOperationStatus(definedOperationStatus.E_DISCONNECTED_DEVICE);
        return this.manageProcessingCommand();
      } else if (currentCommand === null) { // 현재 진행 할 명령이 없다면 중앙 명령 처리에 보고
        this.updateOperationStatus(definedOperationStatus.E_NON_CMD);
        return this.manageProcessingCommand();
      } else {
        // 명령 수행에 대기 시간이 존재한다면 해당 시간만큼 setTimer 가동 시킨 후 대기열로 이동
        if (currentCommand.delayExecutionTimeoutMs) {
          this.updateOperationStatus(definedOperationStatus.PROCESSING_DELEAY_COMMAND);
          return this.manageProcessingCommand();
        } else {
          return this.transferCommandToDevice();
        }
      }
    } catch (error) {
      // 장치로 명령을 요청하는 중에 예기치 못한 에러가 발생하였을 경우
      this.updateOperationStatus(definedOperationStatus.E_UNEXPECTED);
      return this.manageProcessingCommand(error);
    }
  }

  /** @private 명령 재전송 처리 */
  retryRequestProcessingCommand() {
    BU.CLI('retryWrite', this.retryChance);
    this.retryChance -= 1;
    if (this.retryChance > 0) {
      // 0.01 초 지연 시간을 두지 않음
      // return Promise.delay(10).then(() => {
      this.requestProcessingCommand();
      // });
    } else if (this.retryChance === 0) { // 3번 재도전 실패시 다음 명령 수행
      this.updateOperationStatus(definedOperationStatus.E_RETRY_MAX);
      return this.manageProcessingCommand();
    }
  }

  /**
   * @private 현재 명령을 수행하는 과정에서 생기는 제어 상태 변경 처리
   * @param {operationStatus} operationStatus 
   */
  updateOperationStatus(operationStatus) {
    // BU.CLI('updateOperationStatus', operationStatus);
    let currentCommandSet = this.iterator.currentCommandSet;

    // 진행 중인 명령이 없거나 명령 삭제 일 경우에는 업데이트 제외
    if(_.isEmpty(currentCommandSet) || currentCommandSet.operationStatus === definedOperationStatus.PROCESSING_DELETE_COMMAND){
      return false;
    }
    currentCommandSet.operationStatus = operationStatus;
  }

  /**
   * @param {string} message 
   * @param {Error=} messageError 
   */
  _sendMessageToCommander(message, messageError) {
    const currentCommandSet = this.iterator.currentCommandSet;
    const currentReceiver = this.iterator.currentReceiver;
    /** @type {dcMessage} */
    const dcMessageFormat = {
      commandSet: currentCommandSet,
      msgCode: message,
      msgError: messageError ? messageError : undefined,
      spreader: this
    };

    // BU.CLIN(currentReceiver);
    currentReceiver && currentReceiver.onDcMessage(dcMessageFormat);
  }

  /**
   * @protected 
   * 명령 집합을 총 관리 감독하는 메소드.
   * 명령을 수행하는 과정에서 발생하는 이벤트 처리 담당.
   * 명령 처리 순서 관리 감독.
   * @param {Error} error 에러
   */
  manageProcessingCommand(error) {
    // BU.CLIN(this.commandStorage, 4);
    // BU.CLI('this.hasPerformCommand', this.hasPerformCommand);
    const currentCommandSet = this.iterator.currentCommandSet;
    // BU.CLIN(this.commandStorage, 4);
    const nextCommandSet = this.iterator.nextCommandSet;
    const currentReceiver = this.iterator.currentReceiver;
    const operationStatus = currentCommandSet.operationStatus;
    // 현재 명령이 수행 중일 경우 (currentCommandSet이 설정 되어 있음)
    if (this.hasPerformCommand) {
      // 1:1 통신이라면 해당 사항 없음
      // 명령 집합의 Operation Status에 따른 분기

      /** @type {dcError} */
      const dcErrorFormat = {
        commandSet: currentCommandSet,
        spreader: this
      };

      let hasError = false;
      switch (operationStatus) {
      case definedOperationStatus.WAIT: // Wait
        break;
      case definedOperationStatus.WAIT_ERROR_HANDLING: // WAIT_ERROR_HANDLING
        BU.CLI('WAIT_ERROR_HANDLING');
        return false;
      case definedOperationStatus.REQUEST_CMD: // 명령을 요청중이라면 진행 X
      case definedOperationStatus.RECEIVE_WAIT_DATA: // 데이터 수신을 기다리는 중이라면 진행 X
      case definedOperationStatus.RECEIVE_WAIT_PROCESSING_DATA: // 데이터 수신이 이루어지고 처리를 기다리는 중이라면 진행 X
      case definedOperationStatus.RECEIVE_WAIT_MORE_DATA: // 더 많은 데이터 수신을 기다리는 중이라면 진행 X
        return false;
      case definedOperationStatus.RECEIVE_DATA_DONE: // 데이터 처리 완료
        BU.CLI('RECEIVE_DATA_DONE');
        break;
      case definedOperationStatus.RECEIVE_NEXT_FORCE: // 강제 진행
        BU.CLI('RECEIVE_NEXT_FORCE');
        break;
      case definedOperationStatus.PROCESSING_DELEAY_COMMAND: // 현재 명령이 Delay가 필요하다면 명령 교체
        this._sendMessageToCommander(definedCommandSetMessage.COMMANDSET_MOVE_DELAYSET);
        this.iterator.moveToReservedCmdList();
        break;
      case definedOperationStatus.PROCESSING_DELETE_COMMAND: // Delete
        this._sendMessageToCommander(definedCommandSetMessage.COMMANDSET_DELETE);
        this.iterator.clearCurrentCommandSet();
        break;
      case definedOperationStatus.E_DISCONNECTED_DEVICE: // 장치와의 연결이 해제될 경우에는 반복기에 처리 의뢰. AbstManager에서 이미 해당 메소드를 호출함
        BU.CLI('E_DISCONNECTED_DEVICE');
        return this.iterator.clearAllCommandSetStorage();
      case definedOperationStatus.E_TIMEOUT:
        hasError = true;
        dcErrorFormat.errorInfo = new Error(definedOperationStatus.E_TIMEOUT);
        break;
      case definedOperationStatus.E_DATA_PART:
        hasError = true;
        dcErrorFormat.errorInfo = new Error(definedOperationStatus.E_DATA_PART);
        break;
      case definedOperationStatus.E_UNHANDLING_DATA:
        hasError = true;
        dcErrorFormat.errorInfo = new Error(definedOperationStatus.E_UNHANDLING_DATA);
        break;
      case definedOperationStatus.E_INCORRECT_DATA:
        hasError = true;
        dcErrorFormat.errorInfo = new Error(definedOperationStatus.E_INCORRECT_DATA);
        break;
      case definedOperationStatus.E_RETRY_MAX:
        hasError = true;
        dcErrorFormat.errorInfo = new Error(definedOperationStatus.E_RETRY_MAX);
        break;
      case definedOperationStatus.E_UNEXPECTED:
        hasError = true;
        dcErrorFormat.errorInfo = error;
        break;
      case definedOperationStatus.E_NON_CMD: // NOTE 현재 수행 명령이 없는 경우는 의도적인 것으로 판단하고 별다른 처리하지 않음
        break;
      default:
        break;
      }

      // 에러가 있고 수신자가 있다면 메시지를 보냄
      // hasError && currentReceiver && currentReceiver.onDcError(dcErrorFormat);
      // NOTE 에러가 있다면 다음 명령은 처리 하지 않음
      if(hasError){
        // BU.CLI(dcErrorFormat.errorInfo);
        currentReceiver && currentReceiver.onDcError(dcErrorFormat);
        // 에러 핸들링을 필요로 한다면 시스템 대기
        if(currentCommandSet.hasErrorHandling){
          this.updateOperationStatus(definedOperationStatus.WAIT_ERROR_HANDLING);
          return false;
        }
        // this.iterator.clearCurrentCommandSet();
      }

      // 진행 중인 명령이 모두 수행되었을 경우
      if (this.iterator.isDone()) {
        let skipOperationStatus = [
          definedOperationStatus.PROCESSING_DELETE_COMMAND
        ];
        // Skip 요청 상태가 아니고 현재 명령 집합의 모든 명령을 수행했다면 발송
        if (!skipOperationStatus.includes(operationStatus)) {
          this._sendMessageToCommander(definedCommandSetMessage.COMMANDSET_EXECUTION_TERMINATE);
        }

        // Operation Status 초기화
        this.updateOperationStatus(definedOperationStatus.WAIT);

        // 1:1 통신이라면 진행 X
        if (currentCommandSet.hasOneAndOne && operationStatus !== definedOperationStatus.RECEIVE_NEXT_FORCE) {
          this._sendMessageToCommander(definedCommandSetMessage.ONE_AND_ONE_COMUNICATION);
          return;
        }

        // 모든 명령 수행 완료
        if (_.isEmpty(nextCommandSet)) {
          BU.CLI('모든 명령을 수행하였습니다.');
          // BU.CLIN(this.iterator.currentCommandSet);
          this.iterator.clearCurrentCommandSet();
          this.hasPerformCommand = false;
          return;
        } else {
          // 수행할 NextCommandSet이 존재할 경우
          return this.nextCommand();
        }
      } else { // CurrentCommandSet의 nextCommand가 존재 할 경우
        // 명령 수행
        return this.nextCommand();
      }
    } else { // 현재 명령이 진행중이 아니라면
      BU.CLI('명령 재진행 체크', );
      // 현재 진행중인 명령이 없고
      if (_.isEmpty(currentCommandSet)) {
        // OneAndOne이 아니고, Next CommandSet이 존재한다면
        if (currentCommandSet.hasOneAndOne !== true && !_.isEmpty(nextCommandSet)) {
          // 명령 수행 중으로 교체
          this.hasPerformCommand = true;
          return this.nextCommand();
        }
      } else {
        // 수행할 명령이 있다고 판단하고 명령 수행 요청
        this.hasPerformCommand = true;
        return this.requestProcessingCommand();
      }
    }
  }

  /**
   * 다음 명령을 수행
   */
  nextCommand() {
    // BU.CLI('nextCommand');
    // BU.CLI(this.commandStorage);
    try {
      let currentCommandSet = this.iterator.currentCommandSet;
      // BU.CLIN(currProcessCmdInfo);
      let nextCommandSet = this.iterator.nextCommandSet;
      // BU.CLI(currCmd);
      // 현재 아무런 명령이 존재하지 않을 경우
      this.retryChance = 3;
      if (_.isEmpty(currentCommandSet)) {
        // 명령 집합 이동 
        this.iterator.changeNextCommandSet(nextCommandSet);
        this._sendMessageToCommander(definedCommandSetMessage.COMMANDSET_EXECUTION_START);
        // BU.CLI(this.commandStorage);
        // 현재 수행할 명령 요청
        return this.requestProcessingCommand();
      } else { // 다음 명령이 존재할 경우
        this.iterator.changeNextCommand();
        return this.requestProcessingCommand();
      }
    } catch (error) { // 다음 명령이 존재하지 않을 경우
      // BU.CLI(error);
      this.iterator.clearCurrentCommandSet();
      this.hasPerformCommand = false;
    }
  }
}

module.exports = Manager;