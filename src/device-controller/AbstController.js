'use strict';

const Promise = require('bluebird');

const {BU, CU} = require('base-util-jh');
const AbstManager = require('../device-manager/AbstManager');

require('../format/define');

class AbstController {
  constructor() {
    /** @type {Array.<AbstManager>}  */
    this.observers = [];
    this.configInfo = null;
    this.client = {};

    /** @type {deviceControllerStauts} */
    this.deviceControllerStauts = {
      hasConnect: null,
      hasError: false,
      connectTimer: null

    };

    // 생성자와 동시에 접속하면 Test 연동된 Server의 EADDRNOTAVAIL 발생하여 딜래이 줌.
    Promise.delay(10).then(() => this.connect().catch(() => {}));
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
      currentItem.onEvent(eventName, eventMsg);
    });
  }

  /** 장치와의 연결이 수립되었을 경우 */
  notifyConnect() {
    BU.CLI('notifyConnect', this.configInfo);
    // 이미 연결된 상태였다면 이벤트를 보내지 않음
    if(!this.deviceControllerStauts.hasConnect){
      this.notifyEvent('dcConnected');
    }

    // 타이머 해제, 접속 상태 변경, 에러 상태 변경
    this.deviceControllerStauts.connectTimer && this.deviceControllerStauts.connectTimer.pause();
    this.deviceControllerStauts.connectTimer = null;
    this.deviceControllerStauts.hasConnect = true;
    this.deviceControllerStauts.hasError = false;
  }

  /** 장치와의 연결이 해제되었을 경우 */
  notifyClose() {
    BU.CLI('notifyClose', this.configInfo);
    // 장치와의 연결이 계속해제된 상태였다면 이벤트를 보내지 않음
    if(this.deviceControllerStauts.hasConnect){
      this.notifyEvent('dcDisconnected');
    }
        
    this.deviceControllerStauts.hasConnect = false;

    if(this.deviceControllerStauts.connectTimer === null){
      // 일정 시간에 한번씩 장치에 접속 시도
      this.deviceControllerStauts.connectTimer = new CU.Timer(() => {
        this.deviceControllerStauts.connectTimer = null;
        this.connect().catch(() => {});
      }, 1000 * 20);
    }
    
  }

  /**
   * 장치에서 에러가 발생하였다면
   * @param {*} error 
   */
  notifyError(error) {
    BU.CLI('notifyError', error);
    // 장치에서 이미 에러 내역을 발송한 상태라면 이벤트를 보내지 않음
    if(!this.deviceControllerStauts.hasError){
      this.notifyEvent('dcError', error);
    }
    this.deviceControllerStauts.hasError = true;
    this.notifyClose();
  }

  /**
   * @param {*} data 각 controller에서 수신된 데이터
   */
  notifyData(data){
    // BU.CLI('notifyData', data, data.length);
    this.observers.forEach(currentItem => {
      currentItem.onData(data);
    });
  }
}

module.exports = AbstController;