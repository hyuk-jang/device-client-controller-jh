'use strict';

const AbstCommander = require('../device-commander/AbstCommander');
const AbstManager = require('../device-manager/AbstManager');
const AbstMediator  = require('../device-mediator/AbstMediator');
require('../../../default-intelligence');

/** @abstract */
class AbstBuilder {
  constructor() {
  }


  /**
   * Create 'Commander', 'Manager'
   * @param {deviceInfo} config 
   * @return {{deviceCommander: AbstCommander, deviceManager: AbstManager}}
   */
  setDeviceClient(config){

  }


  // /**
  //  * Create 'Multi Commander', 'Manager'
  //  * @param {deviceInfo} config 
  //  * @param {string} idList 
  //  * @return {{commanderList: Array.<AbstCommander>, deviceManager: AbstManager}}
  //  */
  // addDeviceClientGroup(config, idList){
  
  // }

  /** @return {AbstMediator} */
  getMediator(){
    
  }

  // /**
  //  * Create 'Commander'
  //  * @param {deviceInfo} config 
  //  * @return {AbstCommander}
  //  */
  // addCommander(){

  // }

  // /**
  //  * Create 'Manager'
  //  * @param {deviceInfo} config 
  //  * @return {AbstManager}
  //  */
  // addManager(){

  // }
}

module.exports = AbstBuilder;