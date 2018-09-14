const _ = require('lodash');
const {BU} = require('base-util-jh');
const Manager = require('./Manager');

const Iterator = require('./Iterator');

const AbstMediator = require('../device-mediator/AbstMediator');
const AbstController = require('../device-controller/AbstController');

// DeviceManager는 DeviceController와 1:1 매칭.
/** @type {{id: *, instance:ManagerSetter}[]} */
const instanceList = [];

class ManagerSetter extends Manager {
  /** Manager를 초기화 처리 */
  /** Builder에서 요청 메소드 */
  /** @param {deviceInfo} config */
  setManager(config) {
    /** @type {AbstController} */
    let deviceController = null;
    let Controller = null;

    // BU.CLI(config);
    switch (config.connect_info.type) {
      case 'serial':
        switch (config.connect_info.subType) {
          case 'parser':
            Controller = require('../device-controller/serial/SerialWithParser');
            break;
          default:
            Controller = require('../device-controller/serial/Serial');
            break;
        }
        break;
      case 'zigbee':
        switch (config.connect_info.subType) {
          case 'xbee':
            Controller = require('../device-controller/zigbee/SerialWithXbee');
            break;
          default:
            break;
        }
        break;
      case 'socket':
        switch (config.connect_info.subType) {
          case 'parser':
            Controller = require('../device-controller/socket/SocketWithParser');
            break;
          default:
            Controller = require('../device-controller/socket/Socket');
            break;
        }
        break;
      case 'modbus':
        switch (config.connect_info.subType) {
          case 'rtu':
            Controller = require('../device-controller/modbus/ModbusRTU');
            break;
          case 'tcp':
            Controller = require('../device-controller/modbus/ModbusTCP');
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }

    if (_.isNull(Controller)) {
      throw new Error('There is no such device.');
    } else {
      deviceController = new Controller(config, config.connect_info);
    }
    // Controller의 접속 정보를 ID로 함
    this.id = deviceController.configInfo;

    // 해당 장치가 이미 존재하는지 체크
    const foundInstance = _.find(instanceList, instanceInfo => _.isEqual(instanceInfo.id, this.id));
    // 장치가 존재하지 않는다면 instanceList에 삽입하고 deviceController에 등록
    if (_.isEmpty(foundInstance)) {
      // observer 등록
      deviceController.attach(this);
      this.config = config;
      this.hasPerformCommand = false;
      // Manager에 Device 등록
      this.deviceController = deviceController;
      // BU.CLI('@@@@@@@@@@@', this.id);
      // 신규 정의시 instanceList에 저장
      instanceList.push({
        id: this.id,
        instance: this,
      });
      this.retryChance = 3; // 데이터 유효성 검사가 실패, 데이터 수신 에러가 있을 경우 3회까지 ProcessCmd 재전송
      /**
       * @type {commandStorage}
       */
      this.commandStorage = {};

      this.createIterator();

      return this;
    }
    // singleton pattern
    return foundInstance.instance;
  }

  /**
   *
   * @param {deviceInfo} config
   * @param {string} siteUUID
   */
  setPassiveManager(config, siteUUID) {
    /** @type {AbstController} */
    let deviceController = null;
    let Controller = null;

    // BU.CLI(config);
    switch (config.connect_info.type) {
      case 'socket':
        switch (config.connect_info.subType) {
          case 'parser':
            Controller = require('../device-controller/server/SocketClientWithParser');
            break;
          default:
            Controller = require('../device-controller/server/SocketClient');
            break;
        }
        break;
      default:
        break;
    }

    if (_.isNull(Controller)) {
      throw new Error('There is no such device.');
    } else {
      deviceController = new Controller(config, siteUUID);
    }

    // Controller의 접속 정보를 ID로 함
    this.id = siteUUID;
    // 해당 매니저가 이미 존재하는지 체크
    const foundInstance = _.find(instanceList, instanceInfo => _.isEqual(instanceInfo.id, this.id));
    if (_.isEmpty(foundInstance)) {
      // observer 등록
      deviceController.attach(this);
      this.config = config;
      this.hasPerformCommand = false;
      // Manager에 Device 등록
      this.deviceController = deviceController;
      // BU.CLI('@@@@@@@@@@@', this.id);
      // 신규 정의시 instanceList에 저장
      instanceList.push({
        id: this.id,
        instance: this,
      });
      this.retryChance = 3; // 데이터 유효성 검사가 실패, 데이터 수신 에러가 있을 경우 3회까지 ProcessCmd 재전송
      /**
       * @type {commandStorage}
       */
      this.commandStorage = {};

      this.createIterator();

      return this;
    }
    return foundInstance.instance;
  }

  /**
   * deviceMediator 을 정의
   * @param {AbstMediator} deviceMediator
   */
  setMediator(deviceMediator) {
    this.mediator = deviceMediator;
  }

  /** Iterator 정의 */
  createIterator() {
    this.iterator = new Iterator(this);
  }

  /**
   * setPassiveManager에 접속한 client
   * @param {string} siteUUID Site 단위 고유 ID
   * @param {*} client setPassiveManager에 접속한 클라이언트
   */
  bindingPassiveClient(siteUUID, client) {
    // BU.CLI(siteUUID);
    // 해당 매니저가 이미 존재하는지 체크
    const foundInstance = _.find(instanceList, instanceInfo =>
      _.isEqual(instanceInfo.id, siteUUID),
    );

    // Manager를 설정하기 전 Binding 을 할 경우 예외처리
    if (_.isEmpty(foundInstance)) {
      throw new Error('The manager is not set up.');
    }

    const {instance} = foundInstance;

    // DeviceController에 client가 비워져있을 경우에만 설정
    if (_.isEmpty(_.get(instance, 'deviceController.client', {}))) {
      instance.deviceController.setPassiveClient(client);
    }
  }
}
module.exports = ManagerSetter;
