'use strict';
const _ = require('lodash');
const net = require('net');
const eventToPromise = require('event-to-promise');

const {BU, CU} = require('base-util-jh');

const AbstController = require('../AbstController');
require('../../format/controllerConstructor');

/** @type {Array.<{id: constructorSocket, instance: Socket}>} */
let instanceList = [];
/** Class Socket 접속 클라이언트 클래스 */
class Socket extends AbstController {
  /**
   * Socket Client 접속 설정 정보
   * @param {deviceClientConstructionInfo} mainConfig
   * @param {constructorSocket} connectInfo Socket Port
   */
  constructor(mainConfig, connectInfo) {
    super(mainConfig);
    this.port = connectInfo.port;
    this.host = connectInfo.host || 'localhost';
    
    this.configInfo = {host: this.host, port: this.port};

    let foundInstance = _.find(instanceList, instanceInfo => {
      return _.isEqual(instanceInfo.id, this.configInfo);
    });
    
    if(_.isEmpty(foundInstance)){
      instanceList.push({id: this.configInfo, instance: this});
      this.setInit();
    } else {
      return foundInstance.instance;
    }

  }

  /**
   * Socket Server로 메시지 전송
   * @param {Buffer|String} 전송 데이터
   * @return {promise} Promise 반환 객체
   */
  write(msg) {
    // BU.CLI(msg);
    let res = this.client.write(msg);
    if(res){
      return Promise.resolve();
    } else {
      return Promise.reject(res);
    }
  }

  /** 장치 접속 시도 */
  async connect() {
    BU.log('Try Connect : ', this.port);
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if(!_.isEmpty(this.client)){
      throw new Error(`이미 접속중입니다. ${this.port}`);
    }

    BU.CLI('?');
    const client = net.createConnection(this.port, this.host);
    client.on('data', bufferData => {
      this.notifyData(bufferData);
    });
    
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
  async disconnect(){
    BU.CLI('????');
    if(!_.isEmpty(this.client)){
      this.client.destroy(err => {
        return this.client;
      });
    } else {
      return this.client;
    }
  }
}

module.exports = Socket;