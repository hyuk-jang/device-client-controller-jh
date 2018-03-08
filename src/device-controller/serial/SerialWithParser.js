'use strict';
const _ = require('underscore');
const serialport = require('serialport');
const eventToPromise = require('event-to-promise');

const BU = require('base-util-jh').baseUtil;

const AbstController = require('../AbstController');

/** @type {Array.<{id: string, instance: SerialDeviceController}>} */
let instanceList = [];
class SerialWithParser extends AbstController{
  /**
   * Serial Port 객체를 생성하기 위한 설정 정보
   * @param {{port: string, baud_rate: number, parser: {type: string, option: *}}} config {port, baud_rate, raget_name}
   */
  constructor(config) {
    super();
    this.port = config.port;
    this.baud_rate = config.baud_rate;
    this.parser = config.parser;

    let foundInstance = _.findWhere(instanceList, {id: this.port});
    if(_.isEmpty(foundInstance)){
      this.configInfo = {port: this.port, baud_rate: this.baud_rate, parser: this.parser };
      instanceList.push({id: this.port, instance: this});
    } else {
      return foundInstance.instance;
    }
  }

  /**
   * Parser Pipe 를 붙임
   * @param {Object} client SerialPort Client
   */
  settingParser(client){
    let parser = null;
    if (this.parser !== undefined && this.parser.type !== undefined) {
      switch (this.parser.type) {
      case 'delimiterParser':
        var Delimiter = serialport.parsers.Delimiter;
        parser = client.pipe(new Delimiter({
          delimiter: this.parser.option
        }));
        parser.on('data', data => {
          this.notifyData(Buffer.concat([data, this.parser.option]));
        });
        break;
      case 'byteLengthParser':
        var ByteLength = serialport.parsers.ByteLength;
        parser = client.pipe(new ByteLength({
          length: this.parser.option
        }));
        parser.on('data', data => {
          this.notifyData(data);
        });
        break;
      case 'readLineParser':
        var Readline = serialport.parsers.Readline;
        parser = client.pipe(new Readline({
          delimiter: this.parser.option
        }));
        parser.on('data', data => {
          this.notifyData(Buffer.from(data));
        });
        break;
      case 'readyParser':
        var Ready = serialport.parsers.Ready;
        parser = client.pipe(new Ready({
          delimiter: this.parser.option
        }));
        parser.on('data', data => {
          this.notifyData(data);
        });
        break;
      default:
        break;
      }
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

  async connect() {
    // BU.CLI('connect');
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if(!_.isEmpty(this.client)){
      throw new Error(`이미 접속중입니다. ${this.port}`);
    }
    const client = new serialport(this.port, {
      baudRate: this.baud_rate,
    });

    this.settingParser(client);

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
module.exports = SerialWithParser;