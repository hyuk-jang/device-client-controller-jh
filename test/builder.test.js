const {
  expect
} = require('chai');
const _ = require('underscore');
// const Promise = require('bluebird');
// const eventToPromise = require('event-to-promise');

const BU = require('base-util-jh').baseUtil;

global._ = _;
global.BU = BU;


// console.log(uuidv4());
const ClientBuilder = require('../src/builder/ClientBuilder');

require('../src/format/define');

// BU.CLI(process);

process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
});

describe('Builder Test', () => {
  if(false){
    it('singleton test ', done => {
      let config = [];

      for(let i = 0; i < 2; i += 1){
      /** @type {deviceClientFormat} */
        let addObj = {};
        addObj.target_id = `device_${i}`;
        addObj.connect_type = 'socket';
        addObj.host = '';
        addObj.port = 9000;
        config.push(addObj);
      }

      let builder = new ClientBuilder();
      var result = null;
      config.forEach(currentItem => {
        result = builder.addDeviceClient(currentItem);
        
        
      });

      // BU.CLI(result.mediator.deviceManagerList);
      expect(result.mediator.deviceManagerList.length).to.be.equal(1);
      done();
    });
  }

  if(true){
    it('addCommand Test ', done => {
      let config = [];
  
      for(let i = 0; i < 1; i += 1){
        /** @type {deviceClientFormat} */
        let addObj = {};
        addObj.target_id = `device_${i}`;
        addObj.connect_type = 'serial';
        addObj.host = '';
        // addObj.port = Number(`900${_.random(0,2)}`);
        addObj.port = `COM1${3 + i}`;
        addObj.baud_rate = 9600;
        addObj.parser = {
          type: 'readLineParser',
          option: '\r\n'
        };
        config.push(addObj);
      }
  
      let builder = new ClientBuilder();
  
      config.forEach(currentItem => {
        let commander = builder.addDeviceClient(currentItem);
        
        commander.mediator.getDeviceManager(commander).connect();


        commander.executeCommand('hi^^', this);
        





      });
      
  
  
  
      done();
    });

  }


});