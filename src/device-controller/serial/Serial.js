'use strict';
const _ = require('lodash');
const serialport = require('serialport');
const eventToPromise = require('event-to-promise');

const AbstController = require('../AbstController');

/** @type {Array.<{id: string, instance: Serial}>} */
let instanceList = [];

class Serial extends AbstController{
  /**
   * Serial Port 객체를 생성하기 위한 설정 정보
   * @param {deviceClientConstructionInfo} mainConfig
   * @param {constructorSerial} connectInfo {port, baud_rate}
   */
  constructor(mainConfig, connectInfo) {
    super(mainConfig);
    this.port = connectInfo.port;
    this.baud_rate = connectInfo.baudRate;
    
    let foundInstance = _.find(instanceList, {id: this.port});
    if(_.isEmpty(foundInstance)){
      this.configInfo = {port: this.port, baud_rate: this.baud_rate};
      instanceList.push({id: this.port, instance: this});
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
  async connect() {
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if(!_.isEmpty(this.client)){
      throw new Error(`이미 접속중입니다. ${this.port}`);
    }
    
    const client = new serialport(this.port, {
      baudRate: this.baud_rate,
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

    await eventToPromise.multi(client, ['open'], ['error', 'close']);
    this.client = client;
    return this.client;
  }
}
module.exports = Serial;