'use strict';

const _ = require('lodash');
const EventEmitter = require('events');

const {BU} = require('base-util-jh');

const Builder = require('../device-builder/Builder');
const AbstCommander = require('../device-commander/AbstCommander');
const AbstManager = require('../device-manager/AbstManager');

const {definedCommanderResponse, definedCommandSetMessage, definedCommandSetRank, definedControlEvent, definedOperationError} = require('../format/moduleDefine');
require('../format/define');

class AbstDeviceClient extends EventEmitter {
  constructor() {
    super();
    /** @private @type {AbstCommander}  */
    this.commander = {};
    /** @type {AbstManager} @private */
    this.manager = {};

    this.definedCommanderResponse = definedCommanderResponse;
    this.definedCommandSetMessage = definedCommandSetMessage;
    this.definedCommandSetRank = definedCommandSetRank;
    this.definedControlEvent = definedControlEvent;
    this.definedOperationError = definedOperationError;
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
      const deviceClientInfo = builder.setDeviceClient(config);
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
      hasOneAndOne: false,
      connect_info: {
        type: '',
      },
      logOption: {
        hasCommanderResponse: false,
        hasDcError: false,
        hasDcEvent: false,
        hasReceiveData: false,
        hasDcMessage: false,
        hasTransferCommand: false
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
      currCmdIndex: 0,
      cmdList: []
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
   * 장치로 명령을 내림
   * 아무런 명령을 내리지 않을 경우 해당 장치와의 연결고리를 끊지 않는다고 판단
   * 명시적으로 hasOneAndOne을 True로 줄 해당 명령 리스트를 모두 수행하고 다음 CommandFormat으로 이동하지 않음
   * @param {commandSet} commandSet 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(commandSet) {
    // BU.CLI(commandSet);
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
  * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
  * @param {string} key 요청 key
  */
  requestTakeAction(key){
    try {
      return this.commander.requestTakeAction(key);
    } catch (error) {
      throw error;
    }
  }



  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @interface
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   */
  updatedDcEventOnDevice(dcEvent) {
    BU.CLIN(dcEvent.spreader);
    BU.CLI(dcEvent.eventName, `commanderId: ${_.get(this.commander, 'id')}, controllerId: ${_.get(dcEvent.spreader, 'id')}`);
  }



  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcMessage} dcMessage 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcMessage(dcMessage){
    BU.CLI(dcMessage.msgCode, `commanderId: ${_.get(dcMessage.commandSet.commander, 'id')}, commandSetId: ${_.get(dcMessage.commandSet, 'commandId')}`);
  }

  /**
   * 장치로부터 데이터 수신
   * @interface
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData){
    BU.CLI(dcData.data, `commanderId: ${_.get(dcData.commandSet.commander, 'id')}, commandSetId: ${_.get(dcData.commandSet, 'commandId')}`);
  }



  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError){
    BU.CLI(dcError.errorInfo, `commanderId: ${_.get(dcError.commandSet.commander, 'id')}, commandSetId: ${_.get(dcError.commandSet, 'commandId')}`);
  }


}

module.exports = AbstDeviceClient;