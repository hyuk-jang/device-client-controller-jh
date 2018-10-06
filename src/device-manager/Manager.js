const _ = require('lodash');
// const {BU, CU} = require('base-util-jh');

const { BU, CU } = require('../../../base-util-jh');

const AbstCommander = require('../device-commander/AbstCommander');
const AbstManager = require('./AbstManager');

const Iterator = require('./AbstIterator');

const {
  definedCommanderResponse,
  definedCommandSetMessage,
  definedOperationStatus,
} = require('../../../default-intelligence').dccFlagModel;

const { writeLogFile } = require('../util/dcUtil');

const Socket = require('../device-controller/socket/Socket');

require('../../../default-intelligence');

/** @class DeviceManager */
class Manager extends AbstManager {
  constructor() {
    super();

    this.operationTimer;
    /** @type {Iterator} */
    this.iterator;
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
    const { currentCommandSet } = this.iterator;

    if (_.isEmpty(currentCommandSet)) {
      throw new Error('No commands are currently in progress.');
    }

    // 현재 진행중인 명령 객체와 일치해야지만 가능
    if (_.isEqual(currentCommandSet.commander, commander)) {
      writeLogFile(
        this,
        'config.logOption.hasCommanderResponse',
        'data',
        'commanderResponse',
        commanderResponse,
      );

      switch (commanderResponse) {
        case definedCommanderResponse.DONE:
          // BU.CLI('definedCommanderResponse.DONE');
          // BU.CLIN(this.commandStorage);
          // 타이머가 붙어있다면 타이머 해제
          currentCommandSet.commandExecutionTimer &&
            currentCommandSet.commandExecutionTimer.pause();
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
          currentCommandSet.commandExecutionTimer &&
            currentCommandSet.commandExecutionTimer.pause();
          this.updateOperationStatus(definedOperationStatus.RECEIVE_NEXT_FORCE);
          this.manageProcessingCommand();
          break;
        // 명령을 재전송 해달라
        case definedCommanderResponse.RETRY:
          // BU.CLI('definedCommanderResponse.RETRY', this.iterator.currentReceiver.id);
          // 타이머가 붙어있다면 타이머 해제
          currentCommandSet.commandExecutionTimer &&
            currentCommandSet.commandExecutionTimer.pause();
          this.retryRequestProcessingCommand();
          break;
        default:
          break;
      }
    } else {
      throw new Error('It does not match the commander of the current command.');
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
      throw new Error('The device is not connected.');
    }
    this.iterator.addCmd(commandSet);
    // 작업 중이 아니라면 명령 제어 요청
    if (!this.hasPerformCommand) {
      this.manageProcessingCommand();
    }
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
    // BU.CLI('onData', data);
    // this.iterator.currentReceiver &&
    // 데이터 수신이 이루어지고 해당 데이터에 대한 Commander의 응답을 기다리는 중
    this.updateOperationStatus(definedOperationStatus.RECEIVE_WAIT_PROCESSING_DATA);
    writeLogFile(this, 'config.logOption.hasReceiveData', 'data', 'onData', data);

    const receiver = this.iterator.currentReceiver;
    // BU.CLI(receiver);
    if (receiver === null) {
      // BU.CLIN(this.iterator.currentCommandSet);
      BU.CLI('Not set Responder --> Completed Data', data);
    } else {
      // Socket 통신이고 데이터가 Object 형태라면 변환하여 반환
      if (this.deviceController instanceof Socket) {
        const strData = data.toString();
        if (BU.IsJsonString(strData)) {
          const jsonData = JSON.parse(strData);
          _.forEach(jsonData, (v, k) => {
            if (_.get(v, 'type') === 'Buffer') {
              jsonData[k] = Buffer.from(v);
            }
          });
          data = jsonData;
        }
      }

      /** @type {dcData} */
      const returnValue = {
        data,
        commandSet: this.iterator.currentCommandSet,
        spreader: this,
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
    // 타이머가 동작 중이라면 이전 명령 타이머 해제
    if (_.get(this.operationTimer, 'getStateRunning') === true) {
      this.operationTimer.pause();
    }
    // BU.log('Device write');
    // BU.CLI(this.sendMsgTimeOutSec);
    const { currentCommandSet } = this.iterator;
    // BU.CLI(processItem);
    const { currentCommand } = this.iterator;

    // 명령 전송을 기다림
    this.updateOperationStatus(definedOperationStatus.REQUEST_CMD);

    // BU.CLIN(currentCommand.data, currentCommand.commandExecutionTimeoutMs);
    writeLogFile(
      this,
      'config.logOption.hasTransferCommand',
      'data',
      'transferData',
      currentCommand.data,
    );

    // BU.CLI('transferCommandToDevice', currentCommand.data);
    let currentMsg = currentCommand.data;
    // Socket 통신이고 데이터가 Json 형태라면 Buffer로 변환. TEST 코드에 사용됨.
    if (
      this.deviceController instanceof Socket &&
      !Buffer.isBuffer(currentCommand.data) &&
      typeof currentCommand.data === 'object'
    ) {
      currentMsg = JSON.stringify(currentMsg);
    }
    // 정해진 시간안에 명령 완료 체크 타이머 구동
    currentCommandSet.commandExecutionTimer = new CU.Timer(() => {
      let error;
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
          error = new Error(currentCommandSet.operationStatus);
          this.updateOperationStatus(definedOperationStatus.E_UNEXPECTED);
          break;
      }
      return this.manageProcessingCommand(error);
    }, currentCommand.commandExecutionTimeoutMs || 1000);
    this.operationTimer = currentCommandSet.commandExecutionTimer;

    await this.deviceController.write(currentMsg);
    // 명령 전송이 성공하였으므로 데이터 수신 상태로 변경
    this.updateOperationStatus(definedOperationStatus.RECEIVE_WAIT_DATA);

    // BU.CLI('명령 요청', this.iterator.currentReceiver.id, processItem.commandExecutionTimeoutMs);
    // console.time(`timeout ${testId}`);
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
      const { currentCommand } = this.iterator;
      // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
      // TODO
      if (_.isEmpty(this.deviceController.client)) {
        this.updateOperationStatus(definedOperationStatus.E_DISCONNECTED_DEVICE);
        return this.manageProcessingCommand();
      }
      if (currentCommand === null) {
        // 현재 진행 할 명령이 없다면 중앙 명령 처리에 보고
        this.updateOperationStatus(definedOperationStatus.E_NON_CMD);
        return this.manageProcessingCommand();
      }
      // 명령 수행에 대기 시간이 존재한다면 해당 시간만큼 setTimer 가동 시킨 후 대기열로 이동
      if (currentCommand.delayExecutionTimeoutMs) {
        this.updateOperationStatus(definedOperationStatus.PROCESSING_DELEAY_COMMAND);
        return this.manageProcessingCommand();
      }
      return this.transferCommandToDevice();
    } catch (error) {
      // 장치로 명령을 요청하는 중에 예기치 못한 에러가 발생하였을 경우
      this.updateOperationStatus(definedOperationStatus.E_UNEXPECTED);
      return this.manageProcessingCommand(error);
    }
  }

  /** @private 명령 재전송 처리 */
  retryRequestProcessingCommand() {
    BU.CLI('retryWrite', this.retryChance);
    // BU.CLI(this.iterator.currentCommand)
    this.retryChance -= 1;
    if (this.retryChance > 0) {
      // 0.01 초 지연 시간을 두지 않음
      // return Promise.delay(10).then(() => {
      this.requestProcessingCommand();
      // });
    } else if (this.retryChance === 0) {
      // 3번 재도전 실패시 다음 명령 수행
      this.updateOperationStatus(definedOperationStatus.E_RETRY_MAX);
      return this.manageProcessingCommand();
    }
  }

  /**
   * @private 현재 명령을 수행하는 과정에서 생기는 제어 상태 변경 처리
   * @param {operationStatus} operationStatus
   */
  updateOperationStatus(operationStatus) {
    const { currentCommandSet } = this.iterator;
    // BU.CLIS(currentCommandSet.operationStatus, operationStatus);

    // 진행 중인 명령이 없거나 명령 삭제 일 경우에는 업데이트 제외
    if (
      _.isEmpty(currentCommandSet) ||
      currentCommandSet.operationStatus === definedOperationStatus.PROCESSING_DELETE_COMMAND
    ) {
      return false;
    }
    // BU.CLI('updateOperationStatus', operationStatus);
    currentCommandSet.operationStatus = operationStatus;
  }

  /**
   * @param {string} message
   * @param {Error=} messageError
   */
  sendMessageToCommander(message, messageError) {
    const { currentCommandSet, currentReceiver } = this.iterator;

    const hasTerminate = _.isEqual(
      message,
      definedCommandSetMessage.COMMANDSET_EXECUTION_TERMINATE,
    );

    if (hasTerminate && _.isEqual(currentCommandSet, this.lastestCommandSet)) {
      return false;
    }
    /** @type {dcMessage} */
    const dcMessageFormat = {
      commandSet: currentCommandSet,
      msgCode: message,
      msgError: messageError || undefined,
      spreader: this,
    };

    // 마지막으로 보낸 CommandSet을 기억
    if (hasTerminate) {
      this.lastestCommandSet = currentCommandSet;
    }

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
    // BU.CLIN(this.commandStorage);
    // BU.CLIN(this.deviceController.configInfo);

    const { currentCommandSet, currentReceiver } = this.iterator;
    // BU.CLIN(this.commandStorage, 4);
    const { operationStatus } = currentCommandSet;
    // BU.CLI(operationStatus);
    // 현재 명령이 수행 중일 경우 (currentCommandSet이 설정 되어 있음)
    if (this.hasPerformCommand) {
      // 1:1 통신이라면 해당 사항 없음
      // 명령 집합의 Operation Status에 따른 분기

      /** @type {dcError} */
      const dcErrorFormat = {
        commandSet: currentCommandSet,
        spreader: this,
      };

      let hasError = false;
      switch (operationStatus) {
        case definedOperationStatus.WAIT: // Wait
          break;
        case definedOperationStatus.WAIT_ERROR_HANDLING: // WAIT_ERROR_HANDLING
          // BU.CLI('WAIT_ERROR_HANDLING');
          return false;
        case definedOperationStatus.REQUEST_CMD: // 명령을 요청중이라면 진행 X
        case definedOperationStatus.RECEIVE_WAIT_DATA: // 데이터 수신을 기다리는 중이라면 진행 X
        case definedOperationStatus.RECEIVE_WAIT_PROCESSING_DATA: // 데이터 수신이 이루어지고 처리를 기다리는 중이라면 진행 X
        case definedOperationStatus.RECEIVE_WAIT_MORE_DATA: // 더 많은 데이터 수신을 기다리는 중이라면 진행 X
          return false;
        case definedOperationStatus.RECEIVE_DATA_DONE: // 데이터 처리 완료
          // BU.CLI('RECEIVE_DATA_DONE');
          break;
        case definedOperationStatus.RECEIVE_NEXT_FORCE: // 강제 진행
          // BU.CLI('RECEIVE_NEXT_FORCE');
          break;
        case definedOperationStatus.PROCESSING_DELEAY_COMMAND: // 현재 명령이 Delay가 필요하다면 명령 교체
          this.sendMessageToCommander(definedCommandSetMessage.COMMANDSET_MOVE_DELAYSET);
          this.iterator.moveToReservedCmdList();
          break;
        case definedOperationStatus.PROCESSING_DELETE_COMMAND: // Delete
          this.sendMessageToCommander(definedCommandSetMessage.COMMANDSET_DELETE);
          this.iterator.clearCurrentCommandSet();
          break;
        case definedOperationStatus.E_DISCONNECTED_DEVICE: // 장치와의 연결이 해제될 경우에는 반복기에 처리 의뢰. AbstManager에서 이미 해당 메소드를 호출함
          // BU.CLI('E_DISCONNECTED_DEVICE');
          // return this.iterator.clearAllCommandSetStorage();
          return false;
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
          dcErrorFormat.errorInfo = _.isError(error)
            ? error
            : new Error(definedOperationStatus.E_UNEXPECTED);
          break;
        case definedOperationStatus.E_NON_CMD: // NOTE 현재 수행 명령이 없는 경우는 의도적인 것으로 판단하고 별다른 처리하지 않음
          break;
        default:
          break;
      }

      // 에러가 있고 수신자가 있다면 메시지를 보냄
      // hasError && currentReceiver && currentReceiver.onDcError(dcErrorFormat);
      // NOTE 에러가 있다면 다음 명령은 처리 하지 않음
      if (hasError) {
        // BU.CLI('hasError');
        // BU.CLI(dcErrorFormat.errorInfo);
        // 에러 핸들링을 필요로 한다면 시스템 대기
        if (_.get(currentCommandSet.controlInfo, 'hasErrorHandling') === true) {
          // BU.CLI(operationStatus);
          // BU.CLIN('hasErrorHandling', dcErrorFormat.errorInfo);
          // 에러 핸들링 상태로 변경
          this.updateOperationStatus(definedOperationStatus.WAIT_ERROR_HANDLING);
          // 에러 메시지 전송
          currentReceiver && currentReceiver.onDcError(dcErrorFormat);
          return false;
        }
        // 에러 메시지 전송
        currentReceiver && currentReceiver.onDcError(dcErrorFormat);
        // this.iterator.clearCurrentCommandSet();
      }

      // 진행 중인 명령이 모두 수행되었을 경우
      if (this.iterator.isDone()) {
        const skipOperationStatus = [definedOperationStatus.PROCESSING_DELETE_COMMAND];
        // Skip 요청 상태가 아니고 현재 명령 집합의 모든 명령을 수행했다면 발송
        if (!skipOperationStatus.includes(operationStatus)) {
          // BU.CLI('TERMINATE 메시지  발송 요청', _.get(currentCommandSet, 'nodeId'));
          this.sendMessageToCommander(definedCommandSetMessage.COMMANDSET_EXECUTION_TERMINATE);
        }

        // Operation Status 초기화
        // BU.CLI('진행 중인 명령이 모두 수행');
        this.updateOperationStatus(definedOperationStatus.WAIT);

        // 1:1 통신 일 경우는 다음 Step으로 넘어가지 않고 현재 if 문 안에서 끝냄.
        if (_.get(this.iterator.currentCommandSet.controlInfo, 'hasOneAndOne') === true) {
          // 포커스를 움직이고자 요청할 경우
          if (operationStatus === definedOperationStatus.RECEIVE_NEXT_FORCE) {
            // 다음 진행할 명령이 존재한다면 바로 수행
            if (!_.isEmpty(this.iterator.nextCommandSet)) {
              return this.nextCommand();
            }
            // 아닐 경우 현재 명령 수행 중 여부를 false 바꿈 (addCommandSet 메소드에서의 명령 추가를 위함)
            this.hasPerformCommand = false;
          }
          // 명령이 모두 수행되었고 1:1 통신을 하고 있다는 메시지를 보냄
          return this.sendMessageToCommander(definedCommandSetMessage.ONE_AND_ONE_COMUNICATION);
        }

        // 모든 명령 수행 완료
        if (_.isEmpty(this.iterator.nextCommandSet)) {
          // BU.CLI('Complete All Standby CommandList', _.get(currentCommandSet, 'nodeId'));
          // BU.CLIN(this.iterator.currentCommandSet);
          this.iterator.clearCurrentCommandSet();
          this.hasPerformCommand = false;
          return;
        }
        // 수행할 NextCommandSet이 존재할 경우
        return this.nextCommand();
      }
      // CurrentCommandSet의 nextCommand가 존재 할 경우
      // 명령 수행
      return this.nextCommand();
    }
    // 현재 명령이 진행중이 아니라면
    // BU.CLI('Command Check');
    // 현재 진행중인 명령이 없고
    if (_.isEmpty(this.iterator.currentCommandSet)) {
      // OneAndOne이 아니고, Next CommandSet이 존재한다면
      if (!_.isEmpty(this.iterator.nextCommandSet)) {
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

  /**
   * 다음 명령을 수행
   */
  nextCommand() {
    // BU.CLI('nextCommand');
    // BU.CLIN(this.commandStorage);
    try {
      const { currentCommandSet, nextCommandSet } = this.iterator;
      // BU.CLIN(currProcessCmdInfo);
      // BU.CLI(currCmd);
      // 현재 아무런 명령이 존재하지 않을 경우
      this.retryChance = 3;
      // BU.CLIN(currentCommandSet);
      if (_.isEmpty(currentCommandSet)) {
        // 명령 집합 이동
        this.iterator.changeNextCommandSet(nextCommandSet);
        this.sendMessageToCommander(definedCommandSetMessage.COMMANDSET_EXECUTION_START);
        // BU.CLIN(this.commandStorage);
        // 현재 수행할 명령 요청
        return this.requestProcessingCommand();
      }
      // 다음 명령이 존재할 경우
      this.iterator.changeNextCommand();
      return this.requestProcessingCommand();
    } catch (error) {
      // 다음 명령이 존재하지 않을 경우
      // BU.CLI(error);
      // writeLogFile(this, 'config.logOption.hasDcError', 'error', _.get(error, 'message'),  _.get(error, 'stack'));
      this.iterator.clearCurrentCommandSet();
      this.hasPerformCommand = false;
      throw error;
    }
  }
}

module.exports = Manager;
