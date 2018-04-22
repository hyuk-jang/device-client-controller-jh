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


const AbstDeviceClient = require('../src/device-client/AbstDeviceClient');
const SerialDeviceController = require('../src/device-controller/serial/Serial');
const SerialDeviceControllerWithParser = require('../src/device-controller/serial/SerialWithParser');
const SocketDeviceController = require('../src/device-controller/socket/Socket');

// console.log(uuidv4());
const DeviceManager = require('../src/device-manager/Manager');

describe('Device Manager Test', () => {
  describe('Manager Test', () => {
    if(true){
      it('iterator Test', async() => {
        const deviceManager = new DeviceManager({
          target_id: 'VantagePro_1',
          target_name: 'Davis Vantage Pro2',
          target_category: 'weathercast',
          target_protocol: 'vantagepro2',
        });
        // TEST
        // 저장소 생성
        deviceManager.commandStorage = { process: {}, rankList: [] };
        // 반복기 생성
        deviceManager.createIterator();
        // 명령을 받을 객체 생성
        deviceManager.deviceController = {write: cmd => BU.log(cmd)};
        // 장치 연결자 생성
        deviceManager.deviceController.client = {alive:true};

 
        const cmdInfo = {
          rank: 1,
          name: '이름',
          observer: this,
          cmdList: [],
          currCmdIndex: 0
        };
  
        let emergencyCmdInfo = {
          rank: 0,
          name: '긴급 홍길동',
          cmdList: ['긴급 명령 1', '긴급 명령 2'],
          currCmdIndex: 0
        };
        for(let i = 0; i < 3; i += 1){
          cmdInfo.rank = _.random(1, 3);
          cmdInfo.name = '홍길동' + i;
          cmdInfo.observer = '홍길동' + i;
          cmdInfo.cmdList = [];
  
          for(let j = 0; j < _.random(1, 3); j += 1 ){
            // cmdInfo.cmdList.push(uuidv4());
            cmdInfo.cmdList.push(`i:${i} j:${j}`);
          }
  
          // BU.CLI(cmdInfo);
          deviceManager.addCommand(_.cloneDeep(cmdInfo));
        }
        
        BU.CLI(deviceManager.commandStorage);
        // 긴급 명령 추가
        Promise.delay(3300).then(() => {
          deviceManager.addCommand(emergencyCmdInfo);
        });
  
        expect(true).to.be.ok;
      });
    }


  });
  
  if(false){
    describe('DeviceController Test', () => {
      it('AbstractDeviceManager', async() => {
        const deviceManager = new DeviceManager();
        deviceManager.createIterator();
  
        const config = {
          target_id: 'VantagePro_1',
          target_name: 'Davis Vantage Pro2',
          target_category: 'weathercast',
          target_protocol: 'vantagepro2',
          connect_info: {
            hasOneAndOne: true,
            type: 'socket',
            port: 9000
          },
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
  }

});

process.on('unhandledRejection', function (reason, p) {
  console.trace('Possibly Unhandled Rejection at: Promise ', p, ' \nreason: ', reason);
  // application specific logging here
});
