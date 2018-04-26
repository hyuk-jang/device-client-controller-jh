'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const {BU, CU} = require('base-util-jh');

const AbstCommander = require('../device-commander/AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('./AbstManager');

const Iterator = require('./Iterator');

const { definedOperationStatus, definedCommandSetMessage } = require('../format/moduleDefine');

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
      this.config = config;
      this.hasPerformCommand = false;
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
    this.commandStorage = {};

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


  

  /** Commander로부터 요청 */
  /**
   * updateData를 통해 전달받은 데이터에 대한 Commander의 응답을 받을 메소드
   * 응답받은 데이터에 문제가 있거나 다른 사유로 명령을 재 전송하고자 할 경우(3회까지 가능)
   * @param {AbstCommander} commander 
   * @param {string} msg 'isOk', 'retry'
   */
  responseToDataFromCommander(commander, msg) {
    // BU.CLI('responseToDataFromCommander');
    let currentCommandSet = this.iterator.currentCommandSet;

    if (_.isEmpty(currentCommandSet)) {
      throw new Error('현재 진행중인 명령은 없습니다.');
    }

    // 현재 진행중인 명령 객체와 일치해야지만 가능
    if (_.isEqual(currentCommandSet.commander, commander)) {
      switch (msg) {
      case 'isOk':
        BU.CLI('isOk', this.iterator.currentReceiver.id);
        // 타이머가 붙어있다면 타이머 해제
        currentCommandSet.commandExecutionTimer && currentCommandSet.commandExecutionTimer.pause();
        this.updateOperationStatus(definedOperationStatus.RESPONE_SUCCESS);
        this.manageProcessingCommand();
        break;
        // 명령을 재요청할 경우 진행중인 timeout 처리는 해제
      case 'retry':
        BU.CLI('retry', this.iterator.currentReceiver.id);
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
   * @param {commandSet} cmdInfo 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  addCommandSet(cmdInfo) {
    // BU.CLIN(cmdInfo);
    // DeviceController 의 client가 빈 객체라면 연결이 해제된걸로 판단
    // BU.CLI(this.deviceController.client);
    if (_.isEmpty(this.deviceController.client)) {
      return false;
    }
    // BU.CLIN(cmdInfo);
    this.iterator.addCmd(cmdInfo);
    // BU.CLI(this.commandStorage);
    // 현재 진행 중인 명령이 없다면 즉시 해당 명령 실행
    // if ( _.isEmpty(this.commandStorage.currentCommandSet)) {
    //   this.nextCommand();
    // }
    this.manageProcessingCommand();
    return true;
  }

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {commandStorage}
   */
  deleteCommandSet(commandId) {
    this.iterator.deleteCmd(commandId);
    return this.iterator.commandSetStorage;
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
    await this.deviceController.write(currentCommand.data);

    // BU.CLI('명령 요청', this.iterator.currentReceiver.id, processItem.commandExecutionTimeoutMs);
    // console.time(`timeout ${testId}`);
    currentCommandSet.commandExecutionTimer = new CU.Timer(() => {
      this.updateOperationStatus(definedOperationStatus.E_TIMEOUT);
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
          this.updateOperationStatus(definedOperationStatus.REQUEST_DELAY);
          return this.manageProcessingCommand();
        } else {
          this.iterator.currentCommandSet.operationStatus = definedOperationStatus.REQUEST_CMD;
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
    BU.CLI('retryWrite');
    this.retryChance -= 1;
    if (this.retryChance > 0) {
      // 0.01 초 지연 시간을 둠
      return Promise.delay(10).then(() => {
        this.requestProcessingCommand();
      });
    } else if (this.retryChance === 0) {  // 3번 재도전 실패시 다음 명령 수행
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
    // 명령 삭제 일 경우에는 업데이트 제외
    if (currentCommandSet.operationStatus !== definedOperationStatus.REQUEST_DELETE) {
      currentCommandSet.operationStatus = operationStatus;
    }
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
    const receiver = this.iterator.currentReceiver;
    // 현재 명령이 수행 중일 경우 (currentCommandSet이 설정 되어 있음)
    if (this.hasPerformCommand) {
      // 1:1 통신이라면 해당 사항 없음
      // 명령 집합의 Operation Status에 따른 분기

      /** @type {dcError} */
      const dcErrorFormat = {commandSet: currentCommandSet, spreader: this};
      /** @type {dcMessage} */
      const dcMessageFormat = {commandSet: currentCommandSet, spreader: this};


      switch (operationStatus) {
      case definedOperationStatus.WAIT: // Wait
        break;
      case definedOperationStatus.REQUEST_CMD: // 명령을 요청중이라면 진행 X
        return false;
      case definedOperationStatus.REQUEST_DELAY: // 현재 명령이 Delay가 필요하다면 명령 교체
        this.iterator.moveToReservedCmdList();
        break;
      case definedOperationStatus.E_TIMEOUT:
        BU.CLI('E_TIMEOUT');
        dcErrorFormat.errorInfo = new Error('timeout');
        receiver && receiver.onDcError(dcErrorFormat);
        break;
      case definedOperationStatus.E_RETRY_MAX:
        BU.CLI('E_RETRY_MAX');
        dcErrorFormat.errorInfo = new Error('retryMaxError');
        receiver && receiver.onDcError(dcErrorFormat);
        break;
      case definedOperationStatus.E_DISCONNECTED_DEVICE:
        BU.CLI('E_DISCONNECTED_DEVICE');
        return this.iterator.clearAllCommandSetStorage();
      case definedOperationStatus.E_UNEXPECTED:
        BU.CLI('E_UNEXPECTED');
        dcErrorFormat.errorInfo = error;
        receiver && receiver.onDcError(dcErrorFormat);
        this.iterator.clearCurrentCommandSet();
        break;
      case definedOperationStatus.E_NON_CMD:  // NOTE 현재 수행 명령이 없는 경우는 의도적인 것으로 판단하고 별다른 처리하지 않음
        break;
      case definedOperationStatus.REQUEST_DELETE: // Delete
        dcMessageFormat.msgCode = definedCommandSetMessage.COMMANDSET_DELETE_SUCCESS;
        receiver && receiver.onDcMessage(dcMessageFormat);
        this.iterator.clearCurrentCommandSet();
        break;
      default:
        break;
      }

      // 진행 중인 명령이 모두 수행되었을 경우
      if (this.iterator.isDone()) {
        let sendUpdateDcCompleteTargetList = [
          definedOperationStatus.E_RETRY_MAX,
          definedOperationStatus.E_TIMEOUT,
          definedOperationStatus.RESPONE_SUCCESS,
        ];
        // 명령 요청 상태가 아니고 현재 명령 집합의 모든 명령을 수행했다면 발송
        if (sendUpdateDcCompleteTargetList.includes(operationStatus)) {
          dcMessageFormat.msgCode = definedCommandSetMessage.COMMANDSET_EXECUTION_TERMINATE;
          currentReceiver && currentReceiver.onDcMessage(dcMessageFormat);
        }
        
        // Operation Status 초기화
        currentCommandSet.operationStatus = definedOperationStatus.WAIT;

        // 1:1 통신이라면 진행 X
        if (currentCommandSet.hasOneAndOne) {
          dcMessageFormat.msgCode = definedCommandSetMessage.ONE_AND_ONE_COMUNICATION;
          currentReceiver && currentReceiver.onDcMessage(dcMessageFormat);
          return;
        }

        // 모든 명령 수행 완료
        if (_.isEmpty(nextCommandSet)) {
          BU.CLI('모든 명령을 수행하였습니다.');
          this.iterator.clearCurrentCommandSet();
          this.hasPerformCommand = false;
          return;
        } else {
          // 수행할 NextCommandSet이 존재할 경우
          return this.nextCommand();
        }
      } else {  // CurrentCommandSet의 nextCommand가 존재 할 경우
        // 명령 수행
        return this.nextCommand();
      }
    } else {  // 현재 명령이 진행중이 아니라면
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
    BU.CLI('nextCommand');
    // BU.CLI(this.commandStorage);
    try {
      let currentCommandSet = this.iterator.currentCommandSet;
      // BU.CLIN(currProcessCmdInfo);
      let nextCommandSet = this.iterator.nextCommandSet;
      // BU.CLI(currCmd);
      // 현재 아무런 명령이 존재하지 않을 경우
      if (_.isEmpty(currentCommandSet)) {
        // 명령 집합 이동 
        this.iterator.changeNextCommandSet(nextCommandSet);
        // BU.CLI(this.commandStorage);
        // 현재 수행할 명령 요청
        return this.requestProcessingCommand();
      } else {  // 다음 명령이 존재할 경우
        this.retryChance = 3;
        this.iterator.changeNextCommand();
        return this.requestProcessingCommand();
      }
    } catch (error) { // 다음 명령이 존재하지 않을 경우
      BU.CLI(error);
      this.iterator.clearCurrentCommandSet();
      this.hasPerformCommand = false;
    }
  }
}

module.exports = Manager;