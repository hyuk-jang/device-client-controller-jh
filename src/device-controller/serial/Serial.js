'use strict';
const _ = require('underscore');
const serialport = require('serialport');
const eventToPromise = require('event-to-promise');

const BU = require('base-util-jh').baseUtil;

const AbstController = require('../AbstController');

/** @type {Array.<{id: string, instance: Serial}>} */
let instanceList = [];

class Serial extends AbstController{
  /**
   * Serial Port 객체를 생성하기 위한 설정 정보
   * @param {deviceConfigSerial} config {port, baud_rate}
   */
  constructor(config) {
    super();
    this.port = config.port;
    this.baud_rate = config.baud_rate;
    
    let foundInstance = _.findWhere(instanceList, {id: this.port});
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
    // BU.CLI('connect');
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if(!_.isEmpty(this.client)){
      throw new Error(`이미 접속중입니다. ${this.port}`);
    }
    
    const client = new serialport(this.port, {
      baudRate: this.baud_rate,
    });

    client.on('data', bufferData => {
      // BU.CLI('bufferData', bufferData);
      this.notifyData(bufferData);
    });

    client.on('close', err => {
      this.client = {};
      this.notifyClose(err);
      // this.notifyEvent('dcClose', err);
    });

    client.on('end', () => {
      BU.CLI('Close');
      this.client = {};
      this.notifyClose();
      // this.notifyEvent('dcClose', err);
    });

    this.client.on('error', error => {
      this.notifyError(error);
      // this.notifyEvent('dcError', error);
    });

    await eventToPromise.multi(client, ['open'], ['error', 'close']);
    this.client = client;
    this.notifyConnect();
    // this.notifyEvent('dcConnect');
    return this.client;
  }
}
module.exports = Serial;