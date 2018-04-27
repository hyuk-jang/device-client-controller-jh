const {
  expect
} = require('chai');
const _ = require('lodash');
const Promise = require('bluebird');
const eventToPromise = require('event-to-promise');

const {
  BU,
  CU
} = require('../../base-util-jh');

const AbstDeviceClient = require('../src/device-client/AbstDeviceClient');
const AbstMediator = require('../src/device-mediator/AbstMediator');
const AbstIterator = require('../src/device-manager/AbstIterator');
const AbstManager = require('../src/device-manager/AbstManager');
const AbstController = require('../src/device-controller/AbstController');

global.BU = BU;

const {
  definedControlEvent
} = require('../src/format/moduleDefine');
require('../src/format/define');

const EventEmitter = require('events');

class Receiver extends EventEmitter {
  constructor() {
    super();

    this.data = '';
    this.eventName = '';
  }
  onData(data) {
    this.data = data;
    // BU.CLI(data);
  }

  onEvent(eventName, eventMsg) {
    // if(eventName !== definedControlEvent.ERROR){
    BU.CLIS(eventName, eventMsg);
    this.emit(eventName);
    this.eventName = eventName;
  }
}


init();

async function init() {
  const receiver = new Receiver();

  const abstController = new AbstController();
  let connectTimer = abstController.connectTimer;
  abstController.connectIntervalTime = 1000 * 1; // 재접속 주기 1초로 변경
  // 옵저버 추가
  abstController.attach(receiver);

  // 장치 접속 타이머가 동작 중인지
  if (!connectTimer.getStateRunning()) {
    throw new Error();
  }

  BU.CLI('@@@@@@@@@@@@@@@@@@@@@@@');
  await eventToPromise(receiver, definedControlEvent.CONNECT_FAIL);

  // 설정된 타이머의 남은 시간은 0ms 이하
  if (connectTimer.getTimeLeft() > 0)
    throw new Error();

  // 새로이 설정된 타이머의 시간 설정은 1000ms
  if (abstController.connectTimer.getTimeLeft() < 500)
    throw new Error();

  // 새로이 설정된 타이머는 바로 동작 중
  if (!abstController.connectTimer.getStateRunning())
    throw new Error();

  // 남아 있는 시간 만큼 대기. 새로이 돌아가고 있음
  await Promise.delay(abstController.connectTimer.getTimeLeft());
  BU.CLI(abstController.connectTimer.getTimeLeft());
  // 객체 연결
  abstController.client = {
    alive: true
  };

  await eventToPromise(receiver, definedControlEvent.CONNECT_SUCCESS);
  // 연결이 수립됐으므로 타이머는 정지
  if(abstController.connectTimer.getStateRunning()){
    throw new Error('타이머가 도네');
  }

  // 연결 객체가 끊어지고 에러 발생
  abstController.client = {};
  abstController.notifyError(new Error(definedControlEvent.DEVICE_ERROR));
  await eventToPromise(receiver, definedControlEvent.DISCONNECT);
  BU.CLI(' 기다려 볼까');

  abstController.client = {
    alive: true
  };




}