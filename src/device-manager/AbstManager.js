'use strict';
const _ = require('lodash');
const {BU} = require('base-util-jh');
const eventToPromise = require('event-to-promise');

const AbstCommander = require('../device-commander/AbstCommander');
const AbstMediator = require('../device-mediator/AbstMediator');

require('../format/define');

const EventEmitter = require('events');

class AbstManager extends EventEmitter {
  constructor() {
    super();
    /** @type {AbstMediator} */
    this.mediator;
    this.deviceController = null;
    this.id = '';
  }

  /** 초기화할 내용이 필요할 경우 */
  setInit(){}

  /** 장치와 연결을 하고자 할 경우 */
  async connect(){
    await this.deviceController.connect();

    // await eventToPromise(this, 'dcConnect');
    return true;
  }

  /**
   * Device가 접속되어 있는지 체크
   * @return {boolean} 
   */
  get hasConnected() {
    return _.isEmpty(this.deviceController.client) ? false : true;
  }



  // TODO
  /** 장치와 연결을 해제하고자 할 경우 */
  disconnect(){}

  /** 장치에 메시지를 보내고자 할 경우 */
  async writeCmdToDevice(){}

  setMediator() {}

  /**
   * 명령 추가
   * @param {commandFormat} cmdInfo 
   * @return {boolean} 명령 추가 성공 or 실패. 연결된 장비의 연결이 끊어진 상태라면 명령 실행 불가
   */
  addCommand(cmdInfo) {}


  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {commandStorage}
   */
  deleteCommand(commandId){}

  /**
   * Device Controller에서 새로운 이벤트가 발생되었을 경우 알림
   * @param {string} eventName 'dcConnect' 연결, 'dcClose' 닫힘, 'dcError' 에러
   * @param {*=} eventMsg 
   */
  updateDcEvent(eventName, eventMsg){
    // BU.log(`AbstManager --> ${eventName}`);
    // this.emit(eventName, eventMsg);

    if(_.isEmpty(this.deviceController.client)){
      clearTimeout(this.iterator.currentItem.timer);
      this.iterator.clearAllItem();
    } 

    this.mediator.updateDcEvent(this, eventName, eventMsg);
  }

  /**
   * 장치에서 데이터가 수신되었을 경우 해당 장치의 데이터를 수신할 Commander에게 전송
   * @param {Buffer} data 
   */
  updateDcData(data){
    // BU.CLI('AbstManager --> updateDcData', data);
    // BU.CLIN(this.iterator.currentItem);
    let receiver = this.iterator.currentReceiver;
    if(receiver === undefined){
      // BU.log('Completed Data', data);
    } else {
      // const copyProcessItem = JSON.parse(JSON.stringify(this.iterator.currentItem));
      receiver.updateDcData(this.iterator.currentItem, data, this); 
    }
  }

  /** 명령을 보냈으나 일정시간(1초) 응답이 없을 경우 해당 명령을 내린 Commander에게 알려줌 */
  // updateDcTimeout(){
  //   // BU.log('AbstManager --> updateDcTimeout');
  //   if(_.isEmpty(this.iterator.currentReceiver)){
  //     BU.log('Clear command', this.id);
  //   } else {
  //     this.iterator.currentReceiver.updateDcError(this.iterator.currentItem, new Error('timeOut'));
  //   }
  // }
}

module.exports = AbstManager;