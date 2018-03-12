'use strict';

const EventEmitter = require('events');

const BU = require('base-util-jh').baseUtil;

const uuidv4 = require('uuid/v4');

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
   * @param {deviceClientFormat} config 
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
   *  @return {deviceClientFormat} */
  getDefaultCreateDeviceConfig(){
    /** @type {deviceClientFormat} */
    const generationConfigInfo = {
      target_id: '',
      target_category: '',
      target_protocol: '',
      connect_type: '',
      port: null,
      host: '',
      baud_rate: null,
      parser: {},
      
    };
 
    return generationConfigInfo;
  }
  
  /**
   * Commander로 명령을 내릴 기본 형태를 가져옴 
   * @return {commandFormat} */
  getDefaultCommandConfig(){
    /** @type {commandFormat} */
    const commandFormatInfo = {
      rank: 2,
      name: '',
      uuid: uuidv4(),
      hasOneAndOne: false,
      cmdList: [],
      currCmdIndex: 0,
      timeoutMs: 1000,
    };
 
    return commandFormatInfo;
  }


  getAllCommandStorage(){
    return this.commander.getCommandStorage();
  }

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  getHasConnectedDevice(){
    return this.commander.getHasConnectedDevice;
  }

  /** 현재 발생되고 있는 시스템 에러 리스트 @return {Array.<{code: string, msg: string, occur_date: Date }>} */
  getSystemErrorList(){
    return this.commander.getSystemErrorList;
  }


  // Commander
  /**
   * 장치로 명령을 내림
   * 아무런 명령을 내리지 않을 경우 해당 장치와의 연결고리를 끊지 않는다고 판단
   * 명시적으로 hasOneAndOne을 True로 줄 경우 주어진 첫번째 명령을 발송
   * @param {Buffer|string|commandFormat|null} cmdInfo 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(cmdInfo){
    BU.CLI('executeCommand');
    return this.commander.executeCommand(cmdInfo);
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
   * 장치로부터 데이터 수신
   * @interface
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   * @param {Buffer} data 명령 수행 결과 데이터
   */
  updateDcData(processItem, data){
    BU.CLI(data.toString());
  }

  /**
   * 명령 객체 리스트 수행 종료
   * @interface
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   */
  updateDcComplete(processItem) {
    BU.CLI('모든 명령이 수행 되었다고 수신 받음.', processItem.commander.id);
  }

  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @interface
   * @param {string} eventName 'dcConnect', 'dcClose', 'dcError'
   * @param {*=} eventMsg 
   */
  updateDcEvent(eventName, eventMsg) {
    BU.log('updateDcEvent\t', eventName, eventMsg);
  }

  /**
   * 장치에서 에러가 발생하였을 경우
   * @param {commandFormat} error 현재 장비에서 실행되고 있는 명령 객체
   * @param {Error} errStack 
   */
  updateDcError(error, errStack){
    BU.log(`updateDcError ${error}\t`, errStack);
  }


}

module.exports = AbstDeviceClient;