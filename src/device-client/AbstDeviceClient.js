const _ = require('lodash');
const serialport = require('serialport');
const EventEmitter = require('events');

const { BU } = require('base-util-jh');

const Builder = require('../device-builder/Builder');
const AbstCommander = require('../device-commander/AbstCommander');
const AbstManager = require('../device-manager/AbstManager');

const {
  MODBUS,
  definedCommanderResponse,
  definedCommandSetMessage,
  definedCommandSetRank,
  definedControlEvent,
  definedOperationError,
} = require('../../../default-intelligence').dccFlagModel;

class AbstDeviceClient extends EventEmitter {
  constructor() {
    super();
    /** @private @type {AbstCommander}  */
    this.commander;
    /** @type {AbstManager} */
    this.manager;

    this.MODBUS = MODBUS;
    this.definedCommanderResponse = definedCommanderResponse;
    this.definedCommandSetMessage = definedCommandSetMessage;
    this.definedCommandSetRank = definedCommandSetRank;
    this.definedControlEvent = definedControlEvent;
    this.definedOperationError = definedOperationError;
  }

  /**
   * 접속되어 있는 SerialPort List를 반환
   * @return {Promise.<{comName: string, serialNumber: Buffer, pnpId: string}[]>}}
   */
  async getSerialList() {
    const serialList = await serialport.list();
    return serialList;
  }

  // Builder
  /**
   * Create 'Commander', 'Manager' And Set Property 'commander', 'manager'
   * @param {deviceInfo} config
   */
  setDeviceClient(config) {
    try {
      // BU.CLI(config);
      const builder = new Builder();
      config.getUser = () => this;
      const deviceClientInfo = builder.setDeviceClient(config);
      this.commander = deviceClientInfo.deviceCommander;
      this.manager = deviceClientInfo.deviceManager;
    } catch (error) {
      throw error;
    }
  }

  // Builder
  /**
   * Create 'Commander', 'Manager' And Set Property 'commander', 'manager'
   * @param {deviceInfo} config
   * @param {string} siteUUID
   */
  setPassiveClient(config, siteUUID) {
    try {
      // BU.CLI(config);
      const builder = new Builder();
      config.getUser = () => this;
      const deviceClientInfo = builder.setPassiveClient(config, siteUUID);
      this.commander = deviceClientInfo.deviceCommander;
      this.manager = deviceClientInfo.deviceManager;
    } catch (error) {
      throw error;
    }
  }

  /**
   * setPassiveManager에 접속한 client
   * @param {string} siteUUID Site 단위 고유 ID
   * @param {*} client setPassiveManager에 접속한 클라이언트
   */
  bindingPassiveClient(siteUUID, client) {
    try {
      this.manager.bindingPassiveClient(siteUUID, client);
    } catch (error) {
      throw error;
    }
  }

  // Default
  /**
   * Device와 연결을 수립하고 제어하고자 하는 컨트롤러를 생성하기 위한 생성 설정 정보를 가져옴
   *  @return {deviceInfo} */
  getDefaultCreateDeviceConfig() {
    /** @type {deviceInfo} */
    const generationConfigInfo = {
      target_id: '',
      target_category: '',
      // hasOneAndOne: false,
      connect_info: {
        type: '',
      },
      logOption: {
        hasCommanderResponse: false,
        hasDcError: false,
        hasDcEvent: false,
        hasReceiveData: false,
        hasDcMessage: false,
        hasTransferCommand: false,
      },
      controlInfo: {
        hasErrorHandling: false,
        hasOneAndOne: false,
        hasReconnect: false,
      },
    };

    return generationConfigInfo;
  }

  /**
   * Commander로 명령을 내릴 기본 형태를 가져옴
   * @return {requestCommandSet} */
  getDefaultCommandConfig() {
    /** @type {requestCommandSet} */
    const commandFormatInfo = {
      rank: 2,
      commandId: '',
      currCmdIndex: 0,
      cmdList: [],
    };
    return commandFormatInfo;
  }

  /**
   * Commander와 연결된 장비에서 진행중인 저장소의 모든 명령을 가지고 옴
   * @param {{commander: AbstCommander, commandId: string=}} searchInfo
   * @return {commandStorage}
   */
  findCommandStorage(searchInfo) {
    return this.commander.findCommandStorage(searchInfo);
  }

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  get hasConnectedDevice() {
    // BU.CLIN(this.commander)
    return this.commander.hasConnectedDevice;
  }

  /** 현재 발생되고 있는 시스템 에러 리스트
   * @return {Array.<{code: string, msg: string, occur_date: Date }>}
   */
  get systemErrorList() {
    // BU.CLI(this.commander.systemErrorList);
    return this.commander.systemErrorList === undefined ? [] : this.commander.systemErrorList;
  }

  /* Client가 요청 */

  /**
   * 장치로 명령을 내림
   * @param {commandSet} commandSet
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(commandSet) {
    // BU.CLIN(commandSet);
    try {
      return this.commander.executeCommand(commandSet);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 장치를 제어하는 실제 명령만을 가지고 요청할 경우
   * @param {Buffer|string|Object} cmd 자동완성 기능을 사용할 경우
   * @return {commandSet}
   */
  generationAutoCommand(cmd) {
    try {
      return this.commander.generationAutoCommand(cmd);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 명령 제어에 필요한 항목을 작성할 경우 사용
   * @param {requestCommandSet} commandSetInfo 자동완성 기능을 사용할 경우
   * @return {commandSet}
   */
  generationManualCommand(commandSetInfo) {
    try {
      return this.commander.generationManualCommand(commandSetInfo);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   */
  deleteCommandSet(commandId) {
    return this.commander.deleteCommandSet(commandId);
  }

  /**
   * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
   * @param {string} key 요청 key
   */
  requestTakeAction(key) {
    try {
      return this.commander.requestTakeAction(key);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @abstract
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   * @example 보통 장치 연결, 해제에서 발생
   * dcConnect --> 장치 연결,
   * dcDisconnect --> 장치 연결 해제
   */
  updatedDcEventOnDevice(dcEvent) {
    const managerIdInfo = _.get(dcEvent.spreader, 'id');

    let strManagerInfo = '';
    if (_.isObject(managerIdInfo)) {
      _.forEach(managerIdInfo, (info, key) => {
        strManagerInfo += `${key}: ${info}, `;
      });
    } else {
      strManagerInfo = _.get(dcEvent.spreader, 'configInfo');
    }
    BU.CLIS(
      `${dcEvent.eventName} --> commander: ${_.get(
        this.commander,
        'id',
      )}, connInfo: ${strManagerInfo}`,
    );

    try {
      switch (dcEvent.eventName) {
        case this.definedControlEvent.CONNECT:
          break;
        case this.definedControlEvent.DISCONNECT:
          break;
        case this.definedControlEvent.DATA:
          break;
        case this.definedControlEvent.DEVICE_ERROR:
          break;
        default:
          break;
      }
    } catch (error) {
      BU.CLI(error.message);
    }
  }

  /**
   * @abstract
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcMessage} dcMessage 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcMessage(dcMessage) {
    BU.CLIS(
      `commanderId: ${_.get(dcMessage.commandSet.commander, 'id')}, commandSetId: ${_.get(
        dcMessage.commandSet,
        'commandId',
      )}, nodeId: ${_.get(dcMessage.commandSet, 'nodeId')},`,
      dcMessage.msgCode,
    );

    const message = _.get(dcMessage, 'msgCode');
    switch (message) {
      // 명령 요청 시작
      case this.definedCommandSetMessage.COMMANDSET_EXECUTION_START:
        break;
      // 계측이 완료되면 Observer에게 알림
      case this.definedCommandSetMessage.COMMANDSET_EXECUTION_TERMINATE:
        break;
      // 지연 명령으로 이동
      case this.definedCommandSetMessage.COMMANDSET_MOVE_DELAYSET:
        break;
      // 1:1 통신
      case this.definedCommandSetMessage.ONE_AND_ONE_COMUNICATION:
        break;
      // 명령 삭제됨
      case this.definedCommandSetMessage.COMMANDSET_DELETE:
        break;
      default:
        break;
    }
  }

  /**
   * 장치로부터 데이터 수신
   * @abstract
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData) {
    let realData;
    if (_.get(dcData, 'data.type') === 'Buffer') {
      realData = Buffer.from(dcData.data).toString();
    } else if (Buffer.isBuffer(dcData.data)) {
      realData = dcData.data.toString();
    } else {
      realData = dcData.data;
    }
    BU.CLIS(
      `commanderId: ${_.get(dcData.commandSet.commander, 'id')}, commandSetId: ${_.get(
        dcData.commandSet,
        'commandId',
      )}, nodeId: ${_.get(dcData.commandSet, 'nodeId')},`,
      realData,
    );
  }

  /**
   * @abstract
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError) {
    BU.CLIS(
      `commanderId: ${_.get(dcError.commandSet.commander, 'id')}, commandSetId: ${_.get(
        dcError.commandSet,
        'commandId',
      )}, nodeId: ${_.get(dcError.commandSet, 'nodeId')},
      `,
      dcError.errorInfo,
    );

    const message = _.get(dcError, 'errorInfo.message');

    switch (message) {
      case this.definedOperationError.E_TIMEOUT:
        break;
      case this.definedOperationError.E_RETRY_MAX:
        break;
      case this.definedOperationError.E_UNHANDLING_DATA:
        break;
      case this.definedOperationError.E_UNEXPECTED:
        break;
      case this.definedOperationError.E_NON_CMD:
        break;
      default:
        break;
    }
  }
}

module.exports = AbstDeviceClient;
