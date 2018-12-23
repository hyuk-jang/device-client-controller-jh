const { BU } = require('base-util-jh');
const _ = require('lodash');
const Serialport = require('serialport');

const AbstController = require('../AbstController');

/** @type {Array.<{id: string, instance: Serial}>} */
const instanceList = [];

class Serial extends AbstController {
  /**
   * Serial Port 객체를 생성하기 위한 설정 정보
   * @param {deviceInfo} mainConfig
   * @param {constructorSerial} connectInfo {port, baud_rate}
   */
  constructor(mainConfig, connectInfo) {
    super(mainConfig);
    this.port = connectInfo.port;
    this.baud_rate = connectInfo.baudRate;

    const foundInstance = _.find(instanceList, { id: this.port });
    if (_.isEmpty(foundInstance)) {
      this.configInfo = { port: this.port, baud_rate: this.baud_rate };
      instanceList.push({ id: this.port, instance: this });
      this.setInit();
    } else {
      return foundInstance.instance;
    }
  }

  /**
   * Serial Device로 메시지 전송
   * @param {Buffer|string} 전송 데이터
   * @return {Promise} Promise 반환 객체
   */
  write(msg) {
    return new Promise((resolve, reject) => {
      this.client.write(msg, err => {
        reject(err);
      });
      resolve();
    });
  }

  /** 장치 접속 시도 */
  connect() {
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if (!_.isEmpty(this.client)) {
      throw new Error(`Already connected. ${this.port}`);
    }

    const client = new Serialport(this.port, {
      baudRate: this.baud_rate,
      autoOpen: false,
    });

    client.on('data', bufferData => {
      this.notifyData(bufferData);
    });

    client.on('close', err => {
      this.client = {};
      this.notifyDisconnect(err);
    });

    client.on('end', () => {
      this.client = {};
      this.notifyDisconnect();
    });

    client.on('error', error => {
      this.notifyError(error);
    });

    return new Promise((resolve, reject) => {
      client.open(err => {
        if (err) {
          reject(err);
        } else {
          this.client = client;
          resolve();
        }
      });
    });
  }

  /**
   * Close Connect
   */
  async disconnect() {
    if (!_.isEmpty(this.client)) {
      this.client.close();
      return this.client;
    }
    return this.client;
  }
}
module.exports = Serial;

if (require !== undefined && require.main === module) {
  const serialport = new Serial({}, { port: 'COM2', baudRate: 9600 });
  // setTimeout(() => {
  //   serialport.write(
  //     Buffer.from([
  //       0x7e,
  //       0x00,
  //       0x12,
  //       0x10,
  //       0x01,
  //       0x00,
  //       0x13,
  //       0xa2,
  //       0x00,
  //       0x40,
  //       0xf7,
  //       0xb4,
  //       0x7e,
  //       0xff,
  //       0xfe,
  //       0x00,
  //       0x00,
  //       0x40,
  //       0x73,
  //       0x74,
  //       0x73,
  //       0x39,
  //     ]),
  //   );
  // }, 2000);

  // serialport.connect();

  // setTimeout(() => {
  //   serialport.write(
  //     Buffer.from([
  //       0x7e,
  //       0x00,
  //       0x12,
  //       0x10,
  //       0x01,
  //       0x00,
  //       0x13,
  //       0xa2,
  //       0x00,
  //       0x40,
  //       0xf7,
  //       0xb4,
  //       0x7e,
  //       0xff,
  //       0xfe,
  //       0x00,
  //       0x00,
  //       0x40,
  //       0x73,
  //       0x74,
  //       0x73,
  //       0x39,
  //     ]),
  //   );
  // }, 1000);

  serialport.connect().then(() => {
    console.log('18');
    serialport.write(
      Buffer.from([
        0x7e,
        0x00,
        0x12,
        0x10,
        0x01,
        0x00,
        0x13,
        0xa2,
        0x00,
        0x40,
        0xf7,
        0xb4,
        0x7e,
        0xff,
        0xfe,
        0x00,
        0x00,
        0x40,
        0x73,
        0x74,
        0x73,
        0x39,
      ]),
    );
  });
}
