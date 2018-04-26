'use strict';

const EventEmitter = require('events');

const BU = require('base-util-jh').baseUtil;

const Builder = require('../device-builder/Builder');
const AbstCommander = require('../device-commander/AbstCommander');
const AbstManager = require('../device-manager/AbstManager');

require('../format/define');

class AbstDeviceClient extends EventEmitter {
  constructor() {
    super();
    /** @private @type {AbstCommander}  */
    this.commander = {};
    /** @type {AbstManager} @private */
    this.manager = {};
  }

  // Builder
  /**
   * Create 'Commander', 'Manager' And Set Property 'commander', 'manager'
   * @param {deviceClientConstructionInfo} config 
   */
  setDeviceClient(config){
    try {
      const builder = new Builder();
      config.user = this;
      const deviceClientInfo =  builder.setDeviceClient(config);
      this.commander = deviceClientInfo.deviceCommander;
      this.manager = deviceClientInfo.deviceManager;
    } catch (error) {
      throw error;      
    }
  }

  // Default
  /**
   * Device와 연결을 수립하고 제어하고자 하는 컨트롤러를 생성하기 위한 생성 설정 정보를 가져옴
   *  @return {deviceClientConstructionInfo} */
  getDefaultCreateDeviceConfig(){
    /** @type {deviceClientConstructionInfo} */
    const generationConfigInfo = {
      target_id: '',
      target_category: '',
      target_protocol: '',
      connect_info: {
        type: '',
      }
    };
 
    return generationConfigInfo;
  }
  
  /**
   * Commander로 명령을 내릴 기본 형태를 가져옴 
   * @return {requestCommandSet} */
  getDefaultCommandConfig(){
    /** @type {requestCommandSet} */
    const commandFormatInfo = {
      rank: 2,
      commandId: '',
      cmdList: [],
      currCmdIndex: 0,
      commandExecutionTimeoutMs: 1000,
    };
 
    return commandFormatInfo;
  }


  getAllCommandStorage(){
    return this.commander.getCommandStorage();
  }

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  get hasConnectedDevice(){
    return this.commander.hasConnectedDevice;
  }

  /** 현재 발생되고 있는 시스템 에러 리스트 
   * @return {Array.<{code: string, msg: string, occur_date: Date }>}
   */
  get systemErrorList(){
    return this.commander.systemErrorList === undefined ? [] : this.commander.systemErrorList;
  }

  /* Client가 요청 */
  /**
   * 장치를 제어하는 실제 명령만을 가지고 요청할 경우
   * @param {Buffer|string|undefined} cmdInfo 자동완성 기능을 사용할 경우
   */
  executeAutoCommand(cmdInfo) {
    return this.commander.executeAutoCommand(cmdInfo);
  }

  /**
   * 명령 제어에 필요한 항목을 작성할 경우 사용
   * @param {requestCommandSet} cmdInfo 자동완성 기능을 사용할 경우
   */
  executeManualCommand(cmdInfo) {
    return this.commander.executeManualCommand(cmdInfo);
  }



  /** Manager에게 다음 명령을 수행하도록 요청 */
  requestNextCommand(){
    this.commander.requestNextCommand();
  }
  
  /** Manager에게 현재 실행중인 명령을 재 전송하도록 요청 */
  requestRetryCommand(){
    this.commander.requestRetryCommand();
  }

  /**
  * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
  * @param {string} key 요청 key
  */
  requestTakeAction(key){
    try {
      this.commander.requestTakeAction(key);
    } catch (error) {
      // console.error(error);     
      throw error;
    }
  }


  /**
   * 장치로부터 데이터 수신
   * @interface
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData){
    BU.CLI(dcData.data.toString());
  }

  /**
   * 명령 객체 리스트 수행 종료
   * @interface
   * @param {commandSet} cmdInfo 현재 장비에서 실행되고 있는 명령 객체
   */
  updatedDcCompleteCommandExecution(cmdInfo) {
    // BU.CLI('모든 명령이 수행 되었다고 수신 받음.', processItem.commander.id);
  }

  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @interface
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   */
  updatedDcEventOnDevice(dcEvent) {
    BU.log('updatedDcEventOnDevice\t', dcEvent.eventName);
  }

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError){
    BU.log(`onDcError ${dcError.errorName}\t`, dcError.errorInfo);
  }


}

module.exports = AbstDeviceClient;