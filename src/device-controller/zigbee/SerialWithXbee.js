'use strict';
const _ = require('lodash');
const serialport = require('serialport');
const eventToPromise = require('event-to-promise');

const BU = require('base-util-jh').baseUtil;

const AbstController = require('../AbstController');

const xbee_api = require('xbee-api');

require('../../format/controller/xbee');

/** @type {Array.<{id: string, instance: SerialWithXbee}>} */
let instanceList = [];
class SerialWithXbee extends AbstController{
  /**
   * Serial Port 객체를 생성하기 위한 설정 정보
   * @param {{port: string, baud_rate: number, xbeeConfig: xbeeConstrucorInfo}} config {port, baud_rate, raget_name}
   */
  constructor(config) {
    super();
    this.port = config.port;
    this.baud_rate = config.baud_rate;
    this.xbeeConfig = config.xbeeConfig;
    this.xbeeAPI = null;

    let foundInstance = _.find(instanceList, {id: this.port});
    if(_.isEmpty(foundInstance)){
      this.xbeeAPI = new xbee_api.XBeeAPI(this.xbeeConfig);
      this.configInfo = {port: this.port, baud_rate: this.baud_rate, xbeeConfig: this.xbeeConfig };
      instanceList.push({id: this.port, instance: this});
    } else {
      return foundInstance.instance;
    }
  }

  /**
   * Parser Pipe 를 붙임
   * @param {Object} client SerialPort Client
   */
  settingXbee(client){
    client.pipe(this.xbeeAPI.parser);
    this.xbeeAPI.builder.pipe(client);

    // All frames parsed by the XBee will be emitted here
    this.xbeeAPI.parser.on('data', frame => {
      console.log('>>', frame);
      this.notifyData(frame);
    });
  }

  /**
   * Serial Device로 메시지 전송
   * @param {xbeeApi_0x10} frame_obj 전송 데이터
   * @return {Promise} Promise 반환 객체
   */
  write(frame_obj) {
    if(_.isEmpty(this.client)){
      throw new Error(`장치와 접속이 수행되지 않았습니다.. ${this.port}`);
    }

    return Promise.resolve(this.xbeeAPI.builder.write(frame_obj));
  }

  async connect() {
    // BU.CLI('connect');
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if(!_.isEmpty(this.client)){
      throw new Error(`이미 접속중입니다. ${this.port}`);
    }
    const client = new serialport(this.port, {
      baudRate: this.baud_rate,
    });

    this.settingXbee(client);

    client.on('close', err => {
      this.client = {};
      this.notifyClose(err);
      // this.notifyEvent('dcClose', err);
    });

    client.on('error', error => {
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
module.exports = SerialWithXbee;