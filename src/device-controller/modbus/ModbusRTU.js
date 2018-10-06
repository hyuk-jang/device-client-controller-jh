const _ = require('lodash');
const eventToPromise = require('event-to-promise');

// create an empty modbus client
const ModRTU = require('modbus-serial');
const { BU } = require('base-util-jh');

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
   * @param {modbusReadFormat|modbusFC5|modbusFC15|modbusFC6|writeFC16} modbusData
   * @return {Promise} Promise 반환 객체
   */
  async write(modbusData) {
    // unitId 설정
    try {
      const { fnCode, unitId, address } = modbusData;
      await this.client.setID(unitId);

      let resData;
      switch (fnCode) {
        case 1:
          resData = await this.client.readCoils(address, modbusData.dataLength);
          break;
        case 2:
          resData = await this.client.readDiscreteInputs(address, modbusData.dataLength);
          break;
        case 3:
          resData = await this.client.readHoldingRegisters(address, modbusData.dataLength);
          break;
        case 4:
          resData = await this.client.readInputRegisters(address, modbusData.dataLength);
          break;
        case 5:
          resData = await this.client.writeCoil(address, modbusData.state);
          break;
        case 6:
          resData = await this.client.writeRegister(address, modbusData.value);
          break;
        case 15:
          resData = await this.client.writeCoils(address, modbusData.stateList);
          break;
        case 16:
          resData = await this.client.writeRegisters(address, modbusData.valueList);
          break;
        default:
          break;
      }
      // BU.CLI(resData);
      this.notifyData(resData.data);
      return resData;
    } catch (error) {
      // BU.CLI(error);
      // 포트가 닫혀있는걸 확인 할 경우
      if (error.name === 'PortNotOpenError') {
        this.client = {};
        await this.connect();
      }

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

    // client.connectRTU(
    //   this.port,
    //   {
    //     baudRate: this.baud_rate,
    //   },
    //   hasError => {
    //     BU.CLI(hasError);
    //     if (hasError) {
    //       this.client = {};
    //       this.notifyDisconnect(hasError);
    //       this.emit('close');
    //       return;
    //     }
    //     this.emit('connect');
    //   },
    // );

    client
      .connectRTUBuffered(this.port, { baudRate: this.baud_rate })
      .then(() => this.emit('connect'))
      .catch(this.emit('close'));

    // BU.CLI(result);

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
