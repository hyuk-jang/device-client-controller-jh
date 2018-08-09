const _ = require('lodash');
const net = require('net');
const eventToPromise = require('event-to-promise');
const split = require('split');
const {BU} = require('base-util-jh');

const AbstController = require('../AbstController');

/** @type {Array.<{id: constructorSocket, instance: SocketWithParser}>} */
const instanceList = [];
/** Class Socket 접속 클라이언트 클래스 */
class SocketWithParser extends AbstController {
  /**
   * Socket Client 접속 설정 정보
   * @param {deviceInfo} mainConfig
   * @param {constructorSocketWithParser} connectInfo Socket Port
   */
  constructor(mainConfig, connectInfo) {
    super(mainConfig);
    this.port = connectInfo.port;
    this.host = connectInfo.host || 'localhost';
    this.parserInfo = connectInfo.addConfigInfo;

    this.configInfo = {host: this.host, port: this.port, parserInfo: this.parserInfo};

    const foundInstance = _.find(instanceList, instanceInfo =>
      _.isEqual(instanceInfo.id, this.configInfo),
    );

    if (_.isEmpty(foundInstance)) {
      instanceList.push({id: this.configInfo, instance: this});
      this.setInit();
    } else {
      return foundInstance.instance;
    }
  }

  /**
   * Parser Pipe 를 붙임
   * @param {Object} client SerialPort Client
   */
  settingParser(client) {
    // BU.CLI('settingParser');
    if (this.parserInfo !== undefined && this.parserInfo.parser !== undefined) {
      let stream = null;
      switch (this.parserInfo.parser) {
        case 'delimiterParser':
          stream = client.pipe(split(this.parserInfo.option));
          stream.on('data', data => {
            data += this.parserInfo.option;
            this.notifyData(data);
          });
          break;
        default:
          break;
      }
    }
  }

  /**
   * Socket Server로 메시지 전송
   * @param {Buffer|String} 전송 데이터
   * @return {promise} Promise 반환 객체
   */
  write(msg) {
    // BU.CLI(msg);
    const res = this.client.write(msg);
    if (res) {
      return Promise.resolve();
    }
    return Promise.reject(res);
  }

  /** 장치 접속 시도 */
  async connect() {
    BU.log('Try Connect : ', this.port);
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if (!_.isEmpty(this.client)) {
      throw new Error(`Already connected. ${this.port}`);
    }

    const client = net.createConnection(this.port, this.host);

    this.settingParser(client);

    client.on('close', err => {
      this.client = {};
      this.notifyDisconnect(err);
    });

    client.on('end', () => {
      // console.log('Client disconnected');
    });

    client.on('error', error => {
      this.notifyError(error);
    });
    await eventToPromise.multi(client, ['connect', 'connection', 'open'], ['close', 'error']);
    this.client = client;
    return this.client;
  }

  /**
   * Close Connect
   */
  async disconnect() {
    if (!_.isEmpty(this.client)) {
      this.client.destroy(() => this.client);
    } else {
      return this.client;
    }
  }
}

module.exports = SocketWithParser;