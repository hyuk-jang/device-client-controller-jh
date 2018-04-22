const {
  expect
} = require('chai');
const _ = require('lodash');
const Promise = require('bluebird');
const eventToPromise = require('event-to-promise');

const BU = require('base-util-jh').baseUtil;
const uuidv4 = require('uuid/v4');

global._ = _;
global.BU = BU;


const SerialDeviceController = require('../src/device-controller/serial/Serial');
const SerialDeviceControllerWithParser = require('../src/device-controller/serial/SerialWithParser');
const SocketDeviceController = require('../src/device-controller/socket/Socket');

// console.log(uuidv4());
const DeviceManager = require('../src/device-manager/Manager');

describe('Device Manager Test', () => {
  describe('Manager Test', () => {
    if(false){
      it('iterator Test', (done) => {
        const deviceManager = new DeviceManager();
        deviceManager.createIterator();
  
        const cmdInfo = {
          rank: 1,
          name: '이름',
          observer: this,
          cmdList: [],
          currCmdIndex: 0
        };
  
        for(let i = 0; i < 5; i += 1){
          cmdInfo.rank = _.random(0, 3);
          cmdInfo.name = '홍길동' + i;
          cmdInfo.observer = '홍길동' + i;
          cmdInfo.cmdList = [];
  
          for(let j = 0; j < _.random(1, 3); j += 1 ){
            cmdInfo.cmdList.push(uuidv4());
          }
  
          deviceManager.addCommand(JSON.parse(JSON.stringify(cmdInfo)));
        }
        
        BU.CLI(deviceManager.commandStorage);
  
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        BU.CLI(deviceManager.getReceiver());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        BU.CLI(deviceManager.getProcessItem());
        BU.CLI(deviceManager.getReceiver());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        BU.CLI(deviceManager.getReceiver());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        console.log(deviceManager.nextCommand());
        BU.CLI(deviceManager.commandStorage);
        expect(true).to.be.ok;
        done();
      });
    }


  });
  
  describe('DeviceController Test', () => {
    it('AbstractDeviceManager', async() => {
      const deviceManager = new DeviceManager();
      deviceManager.createIterator();

      const config = {
        'target_id': 'testId',
        'target_name': '인버터 1',
        'connect_type': 'serial',
        'ip': 'localhost',
        'port': 'COM14',
        'baud_rate': 9600,
        parser: {
          type: 'readLineParser',
          option: Buffer.from('\n')
        }
        // parser: {
        //   type: 'delimiterParser',
        //   option: Buffer.from([0x04])
        // }
      };


      let deviceController = {};
      switch (config.connect_type) {
      case 'serial':
        BU.CLI('왓더');
        deviceController = _.has(config, 'parser') ? new SerialDeviceControllerWithParser(config) : new SerialDeviceController(config);
        break;
      case 'socket':
        deviceController = new SocketDeviceController(config);
        break;
      default:
        break;
      }

      deviceManager.setDeviceController(deviceController);
      deviceManager.deviceController.attach(deviceManager);

      BU.CLI(deviceManager);
      await deviceManager.connect();

      expect(true).to.be.ok;

    });
  });

});

process.on('unhandledRejection', function (reason, p) {
  console.trace('Possibly Unhandled Rejection at: Promise ', p, ' \nreason: ', reason);
  // application specific logging here
});
