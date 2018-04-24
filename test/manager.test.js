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
      const deviceManager = new DeviceManager({
        target_id: 'VantagePro_1',
        target_name: 'Davis Vantage Pro2',
        target_category: 'weathercast',
        target_protocol: 'vantagepro2',
      });
      // TEST
      // 저장소 생성
      deviceManager.commandStorage = { processWork: {}, rankList: [] };
      // 반복기 생성
      deviceManager.createIterator();
      // 명령을 받을 객체 생성
      deviceManager.deviceController = {write: cmd => BU.log(cmd)};
      // 장치 연결자 생성
      deviceManager.deviceController.client = {alive:true};

      before(()=> {
        // 자동 명령 수행을 하지 않기위하여 temp 명령 집어넣음
        deviceManager.commandStorage.processWork = {test:'test'};

      }); 

      it('Add & Delete CMD Test', done => {
        /** @type {commandFormat} */
        const cmdInfo = {
          rank: 1,
          commandId: '',
          commander: this,
          cmdList: [],
          currCmdIndex: 0,
          timeoutMs: 1000 * 1
        };
  
        
        // [Add] Rank{2} * 3, Rank{3} * 2
        for(let i = 0; i < 5; i += 1){
          cmdInfo.rank = (i % 2) + 2;
          cmdInfo.commandId = '홍길동' + i;
          cmdInfo.cmdList = [];
          // CmdList = 2 Length
          for(let j = 0; j < i; j += 1 ){
            let addCmdData = {data:`i:${i} j:${j}`};
            cmdInfo.cmdList.push(addCmdData);
          }
  
          // BU.CLI(cmdInfo);
          deviceManager.addCommand(_.cloneDeep(cmdInfo));
        }

        let rankList = deviceManager.commandStorage.rankList;

        // 명령 추가 결과 테스트 // [Add] Rank{2} * 3, Rank{3} * 2
        let rank2 = _.find(rankList, {rank:2});
        expect(rank2.list.length).to.be.eq(3);
        expect(_.head(rank2.list).cmdList.length).to.be.eq(0);
        expect(_.nth(rank2.list, 1).cmdList.length).to.be.eq(2);
        let rank3 = _.find(rankList, {rank:3});
        expect(rank3.list.length).to.be.eq(2);
        expect(_.head(rank3.list).cmdList.length).to.be.eq(1);

        // 삭제 테스트 
        // [Delete] Rank{2} * 3, Rank{3} * 1
        deviceManager.deleteCommand('홍길동1');
        expect(rank3.list.length).to.be.eq(1);
        
        // [Delete] Rank{2} * 2, Rank{3} * 1
        deviceManager.deleteCommand('홍길동0');
        expect(rank2.list.length).to.be.eq(2);

        done();
      });

      // 긴급 명령 추가 및 긴급 명령 추가에 따른 명령 교체 테스트
      it('emergency Add Test', async() => {
        /** @type {commandFormat} */
        let emergencyCmdInfo = {
          rank: 0,
          commandId: '긴급 홍길동',
          cmdList: [{
            data:'긴급 명령 1'
          },{
            data: '긴급 명령 2'
          }],
          currCmdIndex: 0
        };

        // [Add] Rank{0} * 1,  Rank{2} * 3, Rank{3} * 1
        deviceManager.addCommand(emergencyCmdInfo);


        let rankList = deviceManager.commandStorage.rankList;
        let rank0 = _.find(rankList, {rank:0});
        // 정상적인 명령 추가 확인
        expect(rank0.list.length).to.be.eq(1);
        expect(_.head(rank0.list).cmdList.length).to.be.eq(2);

        deviceManager.iterator.deleteCmd('긴급 홍길동');

        BU.CLI(deviceManager.commandStorage);

        // rank로 검색
        let foundRankList = deviceManager.iterator.findRankList({rank:2});
        expect(foundRankList.length).to.be.eq(2);
        // id로 검색
        foundRankList = deviceManager.iterator.findRankList({commandId:'홍길동3'});
        expect(foundRankList.length).to.be.eq(1);
        // 중복 검색, 검색 결과 중복 제거되는지 테스트
        foundRankList = deviceManager.iterator.findRankList({rank:2, commandId:'홍길동2'});
        expect(foundRankList.length).to.be.eq(2);


        
        
        // 명령 재개 후 홍길동2(Rank 2, cmdList Length:2) 수행 테스트
        deviceManager.nextCommand();
        let currRank2Hong = deviceManager.iterator.currentItem;
        expect(currRank2Hong.commandId).to.be.eq('홍길동2');
        expect(currRank2Hong.currCmdIndex).to.be.eq(0);
        // [Delete] Rank{0} * 0,  Rank{2} * 1, Rank{3} * 0
        deviceManager.deleteCommand('홍길동2');
        // deviceManager.deleteCommand('홍길동3');
        BU.CLIN(deviceManager.iterator.currentItem, 2);

        // await Promise.delay(500).then(() => {
        //   BU.log('긴급 홍길동0 추가');
        //   deviceManager.addCommand(emergencyCmdInfo);
        // });
        
        // 1초가 아직 지나지 않았으므로 0
        let currItem = deviceManager.iterator.currentItem;
        BU.CLIN(currItem, 2);
        expect(currItem.currCmdIndex).to.be.eq(0);
        expect(currItem.commandId).to.be.eq('홍길동4');

        // 500 + 600 => 1.1초가 지났으므로 Timeout 발생. 긴급 명령 발생에 의한 명령 교체 테스트
        await Promise.delay(600);

        currItem = deviceManager.iterator.currentItem;
        BU.CLIN(currItem, 2);
        expect(currItem.currCmdIndex).to.be.eq(0);
        expect(currItem.commandId).to.be.eq('긴급 홍길동');


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
