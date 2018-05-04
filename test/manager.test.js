const {
  expect
} = require('chai');
const _ = require('lodash');
const Promise = require('bluebird');
const eventToPromise = require('event-to-promise');

const {BU, CU} = require('../../base-util-jh');

global._ = _;
global.BU = BU;
global.CU = CU;


const AbstDeviceClient = require('../src/device-client/AbstDeviceClient');
const SerialDeviceController = require('../src/device-controller/serial/Serial');
const SerialDeviceControllerWithParser = require('../src/device-controller/serial/SerialWithParser');
const SocketDeviceController = require('../src/device-controller/socket/Socket');

// console.log(uuidv4());
const DeviceManager = require('../src/device-manager/Manager');

const {definedCommandSetRank, definedOperationStatus} = require('../src/format/moduleDefine');
require('../src/format/define');
const {initManager} =  require('../src/util/dcUtil');


describe('Device Manager Test', function() {
  this.timeout(20000);

  
  const commander = {
    /** @param {dcData} dcData */
    onDcData: dcData => BU.CLI(dcData.data),
    /** @param {dcError} dcError */
    onDcError: dcError => BU.CLI(dcError.errorInfo),
    /** @param {dcMessage} dcMessage */
    onDcMessage: dcMessage => BU.CLI(dcMessage.msgCode),
    /** @param {dcEvent} dcEvent */
    updatedDcEventOnDevice: dcEvent => BU.CLI(dcEvent.eventName),
  };

  const cmdInfo = {
    rank: 1,
    commandId: '',
    commander: null,
    cmdList: [],
    currCmdIndex: 0,
    commandExecutionTimeoutMs: 1000 * 1
  };


  
  // 명령 추가 및 삭제
  it('Add & Delete CMD Test', function(done) {
    const deviceManager = new DeviceManager({
      target_id: 'Add & Delete CMD Test',
      target_name: '',
      target_category: '',
      target_protocol: '',
    });
    initManager(deviceManager);


    // 명령 자동 진행을 막기 위하여 1:1 모드로 고정함
    deviceManager.commandStorage.currentCommandSet = {test:'test', hasOneAndOne: true};
    /** @type {commandSet} */

    // [Add] Rank{2} * 3, Rank{3} * 2
    for(let i = 0; i < 5; i += 1){
      cmdInfo.rank = (i % 2) + 2;
      cmdInfo.commandId = '홍길동' + i;
      cmdInfo.commander = null;
      cmdInfo.cmdList = [];
      // CmdList = 2 Length
      for(let j = 0; j < i; j += 1 ){
        let addCmdData = {data:`i:${i} j:${j}`};
        cmdInfo.cmdList.push(addCmdData);
      }
  
      // BU.CLI(cmdInfo);
      deviceManager.addCommandSet(_.cloneDeep(cmdInfo));
    }

    let standbyCommandSetList = deviceManager.commandStorage.standbyCommandSetList;
    // 명령 추가 결과 테스트 // [Add] Rank{2} * 3, Rank{3} * 2
    let rank2 = _.find(standbyCommandSetList, {rank:2});
    expect(rank2.list.length).to.be.eq(3);
    expect(_.head(rank2.list).cmdList.length).to.be.eq(0);
    expect(_.nth(rank2.list, 1).cmdList.length).to.be.eq(2);
    let rank3 = _.find(standbyCommandSetList, {rank:3});
    expect(rank3.list.length).to.be.eq(2);
    expect(_.head(rank3.list).cmdList.length).to.be.eq(1);

    // 삭제 테스트 
    // [Delete] Rank{2} * 3, Rank{3} * 1
    deviceManager.deleteCommandSet('홍길동1');
    expect(rank3.list.length).to.be.eq(1);
        
    // [Delete] Rank{2} * 2, Rank{3} * 1
    deviceManager.deleteCommandSet('홍길동0');
    expect(rank2.list.length).to.be.eq(2);

    done();
  });

  // 1. 명령 수행 도중 긴급 명령 추가(긴급 명령 추가에 따른 명령 교체 테스트)
  // 2. 명령 수행 도중 해당 명령 삭제 
  it('Delete during command execution', async function(){
    const deviceManager = new DeviceManager({
      target_id: 'Delete during command execution',
      target_name: '',
      target_category: '',
      target_protocol: '',
    });
    initManager(deviceManager);
    deviceManager.commandStorage.currentCommandSet = {};
    // this.timeout(5000);
    // [Add] Rank{2} * 1, Rank{3} * 1
    for(let i = 0; i < 2; i += 1){
      cmdInfo.rank = i + 2;
      cmdInfo.commandId = '홍길동' + i;
      cmdInfo.commander = null;
      cmdInfo.cmdList = [];
      // CmdList = 2 Length
      for(let j = 0; j < 2; j += 1 ){
        let addCmdData = {data:`i:${i} j:${j}`};
        cmdInfo.cmdList.push(addCmdData);
      }
      deviceManager.addCommandSet(_.cloneDeep(cmdInfo));
    }

    /** @type {commandSet} */
    let emergencyCmdInfo = {
      rank: definedCommandSetRank.EMERGENCY,
      commandId: '긴급 홍길동',
      cmdList: [{
        data:'긴급 명령 1'
      },{
        data: '긴급 명령 2'
      }],
      currCmdIndex: 0
    };

    // Rank 2 CmdList[0] 수행 중, 0.5초후 긴급 명령 추가
    await Promise.delay(500);
    // [Add] Rank{0} * 1,  Rank{2} * 3, Rank{3} * 1
    deviceManager.addCommandSet(emergencyCmdInfo);

    // 긴급 명령이 추가됨
    let foundRankEmergency = deviceManager.iterator.findStandbyCommandSetList({rank: definedCommandSetRank.EMERGENCY});
    expect(foundRankEmergency.length).to.be.eq(1);
    let foundRank2 = deviceManager.iterator.findStandbyCommandSetList({rank: 2});
    // 명령 수행중이므로 0개
    expect(foundRank2.length).to.be.eq(0);
          
    // 긴급 명령 CmdList[0]이 진행 중
    await Promise.delay(1000);

    foundRank2 = deviceManager.iterator.findStandbyCommandSetList({rank: 2});
    // 명령 교체했으므로 1개
    expect(foundRank2.length).to.be.eq(1);
    // 첫 명령은 수행하였으로
    expect(_.head(foundRank2).currCmdIndex).to.be.eq(1);
    let currentCommandSet = deviceManager.iterator.currentCommandSet;
    // 현재 작업중은 Emergency
    expect(currentCommandSet.rank).to.be.eq(definedCommandSetRank.EMERGENCY);
    // 긴급 명령 CmdList[1]이 진행 중
    await Promise.delay(1000);
    // 2번째 명령 수행중
    expect(currentCommandSet.currCmdIndex).to.be.eq(1);

    // 리스트에서 Rank 2가 최우선이므로 해당 명령을 끄집어와 CmdList[1] 수행 중
    await Promise.delay(1000);
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(currentCommandSet.commandId).to.eq('홍길동0');
    expect(currentCommandSet.rank).to.be.eq(2);
    expect(currentCommandSet.currCmdIndex).to.be.eq(1);

    // Rank 3 끄집어와 CmdList[0] 수행 중
    await Promise.delay(1000);
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(currentCommandSet.rank).to.be.eq(3);
    expect(currentCommandSet.commandId).to.eq('홍길동1');
    expect(currentCommandSet.currCmdIndex).to.be.eq(0);

    // 명령 삭제 요청
    deviceManager.deleteCommandSet(currentCommandSet.commandId);

    // 모든 명령 수행 완료
    await Promise.delay(1000);
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(_.isEqual(currentCommandSet, {})).to.be.eq(true);
  });

  // 1. 지연 명령 수행 시 Delay 대기열로 이동
  // 2. Delay 시간 만큼 경과 시 Standby 대기열 선두에 배치되는지 테스트
  // 3. 선두에 배치된 명령이  processingCommandAtCenter()에 의해 다시 재가동 하는지 테스트
  it('Add & Delete Delay Command', async function(){
    const deviceManager = new DeviceManager({
      target_id: 'Add & Delete Delay Command',
      target_name: '',
      target_category: '',
      target_protocol: '',
    });
    initManager(deviceManager);
    // [Add] Rank{2} * 1, Rank{3} * 1
    for(let i = 0; i < 2; i += 1){
      cmdInfo.rank = i + 2;
      cmdInfo.commandId = '홍길동' + i;
      cmdInfo.commander = null;
      cmdInfo.cmdList = [];
      // CmdList = 2 Length
      for(let j = 0; j < 2; j += 1 ){
        let addCmdData = {data:`i:${i} j:${j}`};
        cmdInfo.cmdList.push(addCmdData);
      }
      deviceManager.addCommandSet(_.cloneDeep(cmdInfo));
      // BU.CLI(cmdInfo);
    }

    // 첫번째 명령부터 지연
    /** @type {commandSet} */
    let delayCmdInfo = {
      rank: definedCommandSetRank.SECOND,
      commandId: '지연 홍길동',
      cmdList: [{
        data:'지연 명령 1',
        delayExecutionTimeoutMs: 3000
      },{
        data: '긴급 명령 2'
      }],
      currCmdIndex: 0
    };
    // Rank 2 CmdList[0] 수행 중, 0.5초후 긴급 명령 추가
    
    await Promise.delay(500)
      .then(() => {
        // [Add] Rank{0} * 1,  Rank{2} * 3, Rank{3} * 1
        deviceManager.addCommandSet(delayCmdInfo);
      });

    // 지연 명령이 추가됨
    let foundRankDelay = deviceManager.iterator.findStandbyCommandSetList({rank: definedCommandSetRank.SECOND});
    expect(foundRankDelay.length).to.be.eq(1);
    
    // Delay Rank 2 명령 교체 후 Rank3 CmdList[0] 수행 중 진행 중
    await Promise.delay(2000);
    let currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(currentCommandSet.commandId).to.eq('홍길동1');
    expect(currentCommandSet.currCmdIndex).to.eq(0);
    let delayCommandSetList = deviceManager.iterator.aggregate.delayCommandSetList;
    expect(delayCommandSetList).to.length(1);
    expect(_.head(delayCommandSetList).commandQueueReturnTimer.getStateRunning()).to.eq(true);

    // 일반 명령이 모두 수행되고 Delay 명령만 남은 상태
    await Promise.delay(2000);
    
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(_.isEqual(currentCommandSet, {})).to.eq(true);
    // 작업 대기 상태
    expect(deviceManager.hasPerformCommand).to.eq(false);

    // Delay 명령이 수면위로 올라옴
    await Promise.delay(1000);
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(currentCommandSet.commandId).to.eq('지연 홍길동');
    expect(currentCommandSet.currCmdIndex).to.eq(0);
    expect(currentCommandSet.delayExecutionTimeoutMs).to.eq(undefined);
    // 작업 대기 상태

    // Delay 명령이 2번째(Delay Time이 없을 경우)
    await Promise.delay(1000);
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(currentCommandSet.commandId).to.eq('지연 홍길동');
    expect(currentCommandSet.currCmdIndex).to.eq(1);

    // Delay 명령이 2번째(Delay Time이 없을 경우)
    await Promise.delay(1000);
    currentCommandSet = deviceManager.iterator.currentCommandSet;
    expect(_.isEqual(currentCommandSet, {})).to.eq(true);


  });


  // 1. 수행 중인 명령 Commander에서 응답 테스트 ['isOk', 'retry']
  // 2. 수행 중인 명령 Commander와 연관이 없는 객체의 응답 테스트
  // 3. 장치 접속 해제 'Disconnect' 발생 시 테스트 [addCommand(), 명렁 처리]
  it.skip('Behavior Operation Status', async function() {
    // 명령 자동 진행을 막기 위하여 1:1 모드로 고정함
    deviceManager.commandStorage.currentCommandSet = {test:'test', hasOneAndOne: true};


    // [Add] Rank{2} * 1, Rank{3} * 1
    for(let i = 0; i < 2; i += 1){
      cmdInfo.rank = i + 2;
      cmdInfo.commandId = '홍길동' + i;
      cmdInfo.commander = commander;
      cmdInfo.cmdList = [];
      // CmdList = 2 Length
      for(let j = 0; j < 2; j += 1 ){
        let addCmdData = {data:`i:${i} j:${j}`};
        cmdInfo.cmdList.push(addCmdData);
      }
      deviceManager.addCommandSet(_.cloneDeep(cmdInfo));

      // isOk 테스트
    }
  });




});

describe.skip('DeviceController Test', () => {
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


process.on('unhandledRejection', function (reason, p) {
  console.trace('Possibly Unhandled Rejection at: Promise ', p, ' \nreason: ', reason);
  // application specific logging here
});
