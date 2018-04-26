'use strict';

const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('../device-manager/AbstManager');
const AbstDeviceClient = require('../device-client/AbstDeviceClient');

require('../format/define');

class AbstCommander {
  constructor() {
    this.protocolConverter = {};
    this.id = null;
    /** @type {AbstMediator} */
    this.mediator = null;
    /** @type {AbstDeviceClient} */
    this.user = null;
  }

  /* Mediator에서 Set 함 */
  /**
   * deviceMediator 을 정의
   * @protected 
   * @param {AbstMediator} deviceMediator 
   * @return {undefined}
   */
  setMediator(deviceMediator) {}

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  get hasConnectedDevice(){}

  /**
   * Commander와 연결된 장비에서 진행중인 저장소의 모든 명령을 가지고 옴 
   * @return {commandStorage}
   */
  getCommandStorage() {}


  /* Client가 요청 */
  /**
   * 장치를 제어하는 실제 명령만을 가지고 요청할 경우
   * @param {Buffer|string|undefined} cmdInfo 자동완성 기능을 사용할 경우
   */
  executeAutoCommand(cmdInfo) {}

  /**
   * 명령 제어에 필요한 항목을 작성할 경우 사용
   * @param {requestCommandSet} cmdInfo 자동완성 기능을 사용할 경우
   */
  executeManualCommand(cmdInfo) {}

  /* 장치에서 일괄 이벤트 발생 */
  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @protected 
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   */
  updatedDcEventOnDevice(dcEvent) {}


  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcMessage} dcMessage 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcMessage(dcMessage){}

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError){}

  /**
   * 장치로부터 데이터 수신
   * @protected 
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData){}


  /** Manager에게 다음 명령을 수행하도록 요청 */
  requestNextCommand(){}

  /** Manager에게 현재 실행중인 명령을 재 전송하도록 요청 */
  requestRetryCommand(){}

  /**
  * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
  * @param {string} key 요청 key
  */
  requestTakeAction(key){}
}
module.exports = AbstCommander;