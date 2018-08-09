const _ = require('lodash');
const eventToPromise = require('event-to-promise');

// create an empty modbus client
const ModRTU = require('modbus-serial');
const {BU} = require('base-util-jh');

const AbstController = require('../AbstController');

/** @type {Array.<{id: string, instance: ModbusRTU}>} */
const instanceList = [];

class ModbusRTU extends AbstController {
  /**
   * Serial Port 객체를 생성하기 위한 설정 정보
   * @param {deviceInfo} mainConfig
   * @param {constructorSerial} connectInfo {port, baud_rate}
   */
  constructor(mainConfig, connectInfo) {
    super(mainConfig);
    this.port = connectInfo.port;
    this.baud_rate = connectInfo.baudRate;

    const foundInstance = _.find(instanceList, {id: this.port});
    if (_.isEmpty(foundInstance)) {
      this.configInfo = {port: this.port, baud_rate: this.baud_rate};
      instanceList.push({id: this.port, instance: this});
      this.setInit();
    } else {
      return foundInstance.instance;
    }
  }

  /**
   * Serial Device로 메시지 전송
   * @param {{FN_CODE: string, unitId: string, params: Object}} mRtuInfo 전송 데이터
   * @return {Promise} Promise 반환 객체
   */
  async write(mRtuInfo) {
    // unitId 설정
    try {
      // BU.CLI(mRtuInfo);
      await this.client.setID(mRtuInfo.unitId);
      const values = _.values(mRtuInfo.params);
      // BU.CLI(values);
      // fnCode에 해당하드 메소드 호출 및 해당 메소드에 param 적용
      const data = await this.client[mRtuInfo.FN_CODE](...values);
      // const data = await this.client.readInputRegisters(0, 1);
      this.notifyData(data.data);
      return data;
    } catch (error) {
      // BU.CLI(error);
      throw error;
    }
  }

  /** 장치 접속 시도 */
  async connect() {
    /** 접속 중인 상태라면 접속 시도하지 않음 */
    if (!_.isEmpty(this.client)) {
      throw new Error(`Already connected. ${this.port}`);
    }

    const client = new ModRTU();

    client.connectRTU(
      this.port,
      {
        baudRate: this.baud_rate,
      },
      hasError => {
        if (hasError) {
          this.client = {};
          this.notifyDisconnect(hasError);
          this.emit('close');
          return;
        }
        this.emit('connect');
      },
    );

    await eventToPromise.multi(this, ['connect', 'connection', 'open'], ['close', 'error']);
    /** @type {ModRTU} */
    this.client = client;
    return this.client;
  }

  /**
   * Close Connect
   */
  async disconnect() {}
}
module.exports = ModbusRTU;
