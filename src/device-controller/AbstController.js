'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const {BU} = require('base-util-jh');
const {CU} = require('../../../base-util-jh');
const AbstManager = require('../device-manager/AbstManager');

require('../format/define');
const {definedControlEvent} = require('../format/moduleDefine');

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
      connectTimer: new CU.Timer(() => this.doConnect(), 10)
    };

    this.connectIntervalTime = 1000 * 20;
  }

  setInit(){}

  // 장치와의 접속을 시도
  async doConnect() {
    BU.CLI('doConnect');
    const timer = this.deviceControllerStauts.connectTimer;
    // 타이머가 작동중이고 남아있는 시간이 있다면 doConnect가 곧 호출되므로 실행하지 않음
    if(timer.getStateRunning() && timer.getTimeLeft() > 0){
      BU.CLI('이미 타이머가 작동 중입니다.');
    } else {
      timer.pause();
      BU.CLI('도전 접속');
      try {
        // 장치 접속 관리 객체가 없다면 접속 수행
        if(_.isEmpty(this.client)){
          await this.connect();
  
          // 장치 연결을 하고 나서도 연결 객체가 없다면 예외 발생
          if(_.isEmpty(this.client)){
            throw new Error('Try Connect To Device Error');
          }
        } 
        // 장치와 접속이 되었다고 알림
        this.notifyConnect();
      } catch (error) {
        // 기존 타이머는 삭제
        
        // 장치 접속 요청 실패 이벤트 발생
        this.notifyEvent(definedControlEvent.CONNECT_FAIL, error);
        // 새로운 타이머 할당
        this.deviceControllerStauts.connectTimer = new CU.Timer(() => {
          this.doConnect();
          // 장치 접속 시도 후 타이머 제거
          // this.deviceControllerStauts.connectTimer.pause();
        }, this.connectIntervalTime);
      }
    }
  }
  /** @return {Promise} 접속 성공시 Resolve, 실패시 Reject  */
  async connect(){}

  // TODO 장치와의 연결 접속 해제 필요시 작성
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
    BU.CLI('notifyEvent', eventName, eventMsg);
    this.observers.forEach(observer => {
      observer.onEvent(eventName, eventMsg);
    });
  }

  /** 장치와의 연결이 수립되었을 경우 */
  notifyConnect() {
    // BU.CLI('notifyConnect', this.configInfo);
    // 신규 접속이라면 이벤트 발송
    !this.deviceControllerStauts.hasConnect && this.notifyEvent(definedControlEvent.CONNECT_SUCCESS);

    // 타이머 해제, 접속 상태 변경, 에러 상태 변경
    this.deviceControllerStauts.hasConnect = true;
    this.deviceControllerStauts.hasError = false;
  }

  /** 장치와의 연결이 해제되었을 경우 */
  notifyDisconnect() {
    // BU.CLI('notifyClose', this.configInfo);
    // 장치와의 연결이 계속해제된 상태였다면 이벤트를 보내지 않음
    this.deviceControllerStauts.hasConnect && this.notifyEvent(definedControlEvent.DISCONNECT);
        
    this.deviceControllerStauts.hasConnect = false;
    // 장치 연결이 해제되었기때문에 재 접속 시도
    // 관련 이벤트 메시지를 보내기 위해 1초의 딜레이를 둠
    // Promise.delay().then(() => this.doConnect());
    this.doConnect();
  }

  /**
   * 장치에서 에러가 발생하였다면
   * @param {Error} error 
   */
  notifyError(error) {
    BU.CLI('notifyError', error);
    // 장치에서 이미 에러 내역을 발송한 상태라면 이벤트를 보내지 않음
    !this.deviceControllerStauts.hasError && this.notifyEvent(definedControlEvent.DEVICE_ERROR, error);
    this.deviceControllerStauts.hasError = true;
    this.notifyDisconnect();
  }

  /**
   * @param {*} data 각 controller에서 수신된 데이터
   */
  notifyData(data){
    // BU.CLI('notifyData', data, data.length);
    this.observers.forEach(observer => {
      observer.onData(data);
    });
  }
}

module.exports = AbstController;