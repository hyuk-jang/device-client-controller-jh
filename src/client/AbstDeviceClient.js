const BU = require('base-util-jh').baseUtil;

require('../src/format/define');
const AbstCommander = require('../device-commander/AbstCommander');

class AbstDeviceClient {
  constructor() {
    /** @type {AbstCommander} */
    this.commander = {};
  }

  /**
   * Device와 연결을 수립하고 제어하고자 하는 컨트롤러를 생성하기 위한 생성 설정 정보를 가져옴
   *  @return {deviceClientFormat} */
  getDefaultCreateDeviceConfig(){
    /** @type {deviceClientFormat} */
    const generationConfigInfo = {
      target_id: '',
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
  getDefaultCommandFormat(){
    /** @type {commandFormat} */
    const commandFormatInfo = {
      rank: 2,
      name: '',
      uuid: uuidv4(),
      hasOneAndOne: false,
      observer: {},
      commander: {},
      cmdList: [],
      currCmdIndex: 0,
      timeoutMs: 1000,
    };
 
    return commandFormatInfo;
  }

  /**
   * 장치로부터 데이터 수신
   * @interface
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   * @param {Buffer} data 명령 수행 결과 데이터
   */
  updateDcData(processItem, data){
    BU.log(data.toString());
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
    BU.log('updateDcEvent\t', eventName);
  }

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @interface
   * @param {commandFormat} processItem 현재 장비에서 실행되고 있는 명령 객체
   * @param {Error} err 
   */
  updateDcError(processItem, err){
    BU.log(`updateDcError ${processItem.commander.id}\t`, processItem, err);
  }

}

module.exports = AbstDeviceClient;