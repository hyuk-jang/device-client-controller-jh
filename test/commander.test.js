'use strict';

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

const Commander = require('../src/device-commander/Commander');


const SerialDeviceController = require('../src/device-controller/serial/Serial');
const SerialDeviceControllerWithParser = require('../src/device-controller/serial/SerialWithParser');
const SocketDeviceController = require('../src/device-controller/socket/Socket');

// console.log(uuidv4());
const Manager = require('../src/device-manager/Manager');

const {definedCommandSetRank, definedOperationStatus} = require('../src/format/moduleDefine');
require('../src/format/define');


/** @type {deviceClientConstructionInfo} config */
const constructorInfo = {
  target_id: 'test1',
  target_category: 'sub_test1',
  loggingOption: {
    hasCommanderResponse: true,
    hasTransferCommand: true,
    hasDcError: true,
    hasDcEvent: true,
    hasReceiveData: true
  }
};


describe('Request Execution Command', function(){
  // 1. Builder를 이용하여 Commnader, Mediator, Manager 생성
  // 2. Mnager 객체 생성
  it('Commander Constuction', function() {
    const manager = new Manager(constructorInfo);
    const commander = new Commander(constructorInfo);
    commander.manager = manager;
  });

  it('Manual Execution', function(done){
    
  });

  it('Automation Execution', function(){

  });

  it('Exeception Execution', function(){
    
  });
  
});

describe('Handling Receive Data', function(){
  
});

describe('Manage System Error', function(){
  
});