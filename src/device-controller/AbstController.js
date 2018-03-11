'use strict';

const Promise = require('bluebird');

const uuidv4 = require('uuid/v4');
const BU = require('base-util-jh').baseUtil;

const AbstManager = require('../device-manager/AbstManager');


class AbstController {
  constructor() {
    /** @type {Array.<AbstManager>}  */
    this.observers = [];
    this.id = uuidv4();
    this.configInfo = null;
    this.client = {};

    this.eventStauts = {
      hasConnect: null,
      hasError: false,
      connectTimer: null

    };

    // 생성자와 동시에 접속하면 Test 연동된 Server의 EADDRNOTAVAIL 발생하여 딜래이 줌.
    Promise.delay(10)
      .then(() => this.connect().catch(() => {}));
  }

  setInit(){}
  /** @return {Promise} 접속 성공시 Resolve, 실패시 Reject  */
  async connect(){}
  disconnect(){}
  
  /** 
   * @param {*} msgInfo 각 장치에 맞는 명령 정보 
   * @return {Promise} 전송 성공시 Resolve, 실패시 Reject
   */
  async write(msgInfo){}

  attach(observer){
    // BU.log('Observer attached');
    this.observers.push(observer);
  }

  /** @param {AbstManager} observer */
  dettach(observer){
    // BU.log('dettach');
    this.observers.forEach((currentItem, index) => {
      if(currentItem === observer){
        this.observers.splice(index, 1);
      }
    });
  }

  notifyEvent(eventName, eventMsg){
    // BU.CLI('notifyEvent', eventName, eventMsg, this.configInfo);
    this.observers.forEach(currentItem => {
      currentItem.updateDcEvent(eventName, eventMsg);
    });
  }

  /** 장치와의 연결이 수립되었을 경우 */
  notifyConnect() {
    // 이미 연결된 상태였다면 이벤트를 보내지 않음
    if(!this.eventStauts.hasConnect){
      this.notifyEvent('dcConnect');
    }

    // 만약 재접속 타이머가 돌아가고 있다면 해제
    clearTimeout(this.eventStauts.connectTimer);

    this.eventStauts.hasConnect = true;
    this.eventStauts.hasError = false;
  }

  /** 장치와의 연결이 해제되었을 경우 */
  notifyClose() {
    // 장치와의 연결이 계속해제된 상태였다면 이벤트를 보내지 않음
    if(this.eventStauts.hasConnect){
      this.notifyEvent('dcClose');
    }
        
    this.eventStauts.hasConnect = false;

    // 일정 시간에 한번씩 장치에 접속 시도
    this.eventStauts.connectTimer =  setTimeout(() => {
      this.connect().catch(() => {});
    }, 1000 * 60);
  }

  /**
   * 장치에서 에러가 발생하였다면
   * @param {*} error 
   */
  notifyError(error) {
    // 장치에서 이미 에러 내역을 발송한 상태라면 이벤트를 보내지 않음
    if(!this.eventStauts.hasError){
      this.notifyEvent('dcError', error);
    }
    this.eventStauts.hasError = true;
  }

  notifyData(data){
    // BU.CLI('notifyData', data);
    this.observers.forEach(currentItem => {
      currentItem.updateDcData(data);
    });
  }
}

module.exports = AbstController;