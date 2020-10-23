const _ = require('lodash');
const net = require('net');
const split = require('split');
const { BU } = require('base-util-jh');

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
    const { connId = '', host = 'localhost', port, addConfigInfo } = connectInfo;
    this.port = port;
    this.host = host;
    this.parserInfo = addConfigInfo;

    // 누적 데이터 추적을 위한 버퍼
    this.data = Buffer.alloc(0);
    // 누적 데이터 추적 폐기를 위한 타이머
    this.setTimer = null;
    // 장치 연결 타입
    this.connectorType = net.Socket;

    this.configInfo = { connId, host, port, parserInfo: this.parserInfo };
    const foundInstance = _.find(instanceList, instanceInfo =>
      _.isEqual(instanceInfo.id, this.configInfo),
    );

    if (_.isEmpty(foundInstance)) {
      instanceList.push({ id: this.configInfo, instance: this });
      this.setInit();
    } else {
      return foundInstance.instance;
    }
  }

  /**
   * Parser Pipe 를 붙임
   * @param {net.Socket} client SerialPort Client
   */
  settingParser(client) {
    // BU.CLI('settingParser', this.parserInfo);
    if (this.parserInfo !== undefined && this.parserInfo.parser !== undefined) {
      let stream = null;
      switch (this.parserInfo.parser) {
        case 'delimiterParser':
          stream = client.pipe(split(this.parserInfo.option));
          stream.on('data', data => {
            data += this.parserInfo.option;
            // BU.CLI(data);
            this.notifyData(data);
          });
          break;
        case 'readLineParser':
          stream = client.pipe(split(this.parserInfo.option));
          stream.on('data', data => {
            this.notifyData(data);
          });
          break;
        // FIXME: 임시로 해둠. stream 기능 사용해야함.
        case 'byteLengthParser':
          client.on('data', data => {
            this.setTimer && clearTimeout(this.setTimer);
            const { option: byteLength } = this.parserInfo;

            this.data = Buffer.concat([this.data, data]);

            if (this.data.length < byteLength) return false;

            const currData = this.data.slice(0, byteLength);

            this.data = this.data.slice(byteLength);

            // 남아있는 잔여 데이터가 존재할 경우 타이머를 작동시켜 기존 시간내에 추가 데이터가 들어오지 않을 경우 비움
            if (this.data.length) {
              // 1초 내로 추가 데이터가 들어오지 않는다면 현재 데이터 비움
              this.setTimer = setTimeout(() => {
                this.data = Buffer.alloc(0);
                this.setTimer = null;
              }, 1000 * 1);
            }

            this.notifyData(currData);

            client.destroy();
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
  async write(msg) {
    // BU.CLI(msg);
    if (_.isEmpty(this.client)) {
      return Promise.reject(new Error('The client did not connect.'));
    }

    const res = this.client.write(msg);
    if (res) {
      return Promise.resolve();
    }
    return Promise.reject(res);
  }

  /** 장치 접속 시도 */
  connect() {
    // BU.log('Try Connect : ', this.port);
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    return new Promise((resolve, reject) => {
      if (!_.isEmpty(this.client)) {
        reject(new Error(`Already connected. ${this.port}`));
      }

      const client = net.createConnection({
        port: this.port,
        host: this.host,
      });

      client.on('connect', () => {
        this.settingParser(client);
        this.client = client;
        resolve();
      });

      client.on('close', err => {
        this.client = {};
        this.notifyDisconnect(err);
      });

      // client.on('data', data => {
      //   console.log('data', data);
      // });

      client.on('end', () => {
        // console.log('Client disconnected');
      });

      client.on('error', error => {
        reject(error);
        this.notifyError(error);
      });
    });
  }

  /**
   * Close Connect
   */
  async disconnect() {
    // BU.CLI('disconnect');
    if (!_.isEmpty(this.client)) {
      // BU.CLI('destroy');
      this.client.destroy();
    } else {
      this.notifyDisconnect();
    }
  }
}

module.exports = SocketWithParser;
