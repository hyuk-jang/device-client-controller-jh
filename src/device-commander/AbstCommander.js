'use strict';

const AbstMediator = require('../device-mediator/AbstMediator');
const AbstManager = require('../device-manager/AbstManager');
const AbstDeviceClient = require('../device-client/AbstDeviceClient');

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


  /** Device Client에서 요청하는 부분 */

  /** 장치의 연결이 되어있는지 여부 @return {boolean} */
  get hasConnectedDevice(){}

  /**
   * 장치로 명령을 내림
   * 아무런 명령을 내리지 않을 경우 해당 장치와의 연결고리를 끊지 않는다고 판단
   * 명시적으로 hasOneAndOne을 True로 줄 해당 명령 리스트를 모두 수행하고 다음 CommandFormat으로 이동하지 않음
   * @param {commandSet} commandSet 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  executeCommand(commandSet) {}

  /**
   * 장치를 제어하는 실제 명령만을 가지고 요청할 경우
   * @param {Buffer|string|undefined} cmdInfo 자동완성 기능을 사용할 경우
   */
  generationAutoCommand(cmdInfo) {}

  /**
   * 명령 제어에 필요한 항목을 작성할 경우 사용
   * @param {requestCommandSet} commandSetInfo 자동완성 기능을 사용할 경우
   */
  generationManualCommand(commandSetInfo) {}

  /**
   * Commander와 연결된 장비에서 진행중인 저장소의 모든 명령을 가지고 옴 
   * @param {{commander: AbstCommander, commandId: string=}} searchInfo 
   * @return {commandStorage}
   */
  findCommandStorage(searchInfo) {}

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   */
  deleteCommandSet(commandId) {}

  /**
   * Manager에게 Msg를 보내어 명령 진행 의사 결정을 취함
   * @param {string} key 요청 key
   */
  requestTakeAction(key) {}


  /* Device Controller에서 수신 --> 장치에서 일괄 이벤트 발생 */
  /**
   * Device Controller 변화가 생겨 관련된 전체 Commander에게 뿌리는 Event
   * @param {dcEvent} dcEvent 'dcConnect', 'dcClose', 'dcError'
   */
  updatedDcEventOnDevice(dcEvent) {}


  /**
   * 현재 진행 중인 명령 객체에 진행 할 명령이 존재하는 지
   * @return {commandInfo} 다음 명령 존재시 : true, 없을 시: false
   */
  get currentCommand() {
    return this.iterator.currentCommand;
  }


  /** Device Manager에서 Event 발생 */

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcError} dcError 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcError(dcError){}

  /**
   * 장치에서 명령을 수행하는 과정에서 생기는 1:1 이벤트
   * @param {dcMessage} dcMessage 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcMessage(dcMessage){}

  /**
   * 장치로부터 데이터 수신
   * @param {dcData} dcData 현재 장비에서 실행되고 있는 명령 객체
   */
  onDcData(dcData){}
}
module.exports = AbstCommander;