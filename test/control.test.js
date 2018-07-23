const {expect} = require('chai');
const _ = require('lodash');
const Promise = require('bluebird');
const eventToPromise = require('event-to-promise');

const {BU, CU} = require('base-util-jh');

const AbstDeviceClient = require('../src/device-client/AbstDeviceClient');
const AbstMediator = require('../src/device-mediator/AbstMediator');
const AbstIterator = require('../src/device-manager/AbstIterator');
const AbstManager = require('../src/device-manager/AbstManager');
const AbstController = require('../src/device-controller/AbstController');

global.BU = BU;

const {definedControlEvent} = require('../../default-intelligence').dccFlagModel;

const EventEmitter = require('events');

class Receiver extends EventEmitter {
  constructor() {
    super();

    this.data = '';
    this.eventName = '';

    this.connectCount = 0;
    this.disconnectCount = 0;
  }

  onData(data) {
    this.data = data;
    // BU.CLI(data);
  }

  onEvent(eventName, eventMsg) {
    // if(eventName !== definedControlEvent.ERROR){
    BU.CLIS(eventName, eventMsg);
    if (eventName === definedControlEvent.CONNECT) {
      this.connectCount++;
    }
    if (eventName === definedControlEvent.DISCONNECT) {
      this.disconnectCount++;
    }
    this.emit(eventName);
    this.eventName = eventName;
  }
}

describe('Device Manager Test', function() {
  this.timeout(15000);

  it('init', async () => {
    const receiver = new Receiver();

    const abstController = new AbstController();
    const connectTimer = abstController.connectTimer;
    abstController.connectIntervalTime = 1000 * 1; // 재접속 주기 1초로 변경
    // 옵저버 추가
    abstController.attach(receiver);

    // 생성자에 등록된 타이머가 발동되므로
    expect(connectTimer.getStateRunning()).to.eq(true);

    // 장치 접속 실패
    // occurConnectCount: 0,  occurDisconnectCount: 1
    await eventToPromise(receiver, definedControlEvent.DISCONNECT);
    // 이벤트를 수신하고 다시 시작하기까지 0.5초 딜레이가 있으므로
    BU.CLI(connectTimer.getTimeLeft());
    expect(connectTimer.getTimeLeft() < 0).to.eq(true);
    // Test 클라이언트를 설정
    abstController.client = {alive: true};

    // 장치 접속 성공
    // occurConnectCount: 1,  occurDisconnectCount: 1
    await eventToPromise(receiver, definedControlEvent.CONNECT);
    expect(receiver.connectCount).to.eq(1);
    // 장치 접속이 성공했으므로 현재 상태는 True
    expect(abstController.hasConnect).to.eq(true);

    // 연결 객체 초기화 후 접속 요청
    abstController.client = {};
    // occurConnectCount: 1,  occurDisconnectCount: 2
    abstController.doConnect();
    await eventToPromise(receiver, definedControlEvent.DISCONNECT);
    expect(receiver.disconnectCount).to.eq(2);
    expect(abstController.hasConnect).to.eq(false);

    // 장치에서 접속이 성공하여 연결 객체가 생성되고 이벤트가 올라온 상태 테스트
    abstController.client = {alive: true};
    await eventToPromise(receiver, definedControlEvent.CONNECT);
    expect(abstController.hasConnect).to.eq(true);
    // occurConnectCount: 2,  occurDisconnectCount: 2
    expect(receiver.connectCount).to.eq(2);
    expect(receiver.connectCount).to.eq(2);
    expect(receiver.disconnectCount).to.eq(2);

    expect(true).to.be.ok;
  });
});
