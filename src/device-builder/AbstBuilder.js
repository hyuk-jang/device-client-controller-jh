'use strict';

const AbstCommander = require('../device-commander/AbstCommander');
const AbstManager = require('../device-manager/AbstManager');
const AbstMediator  = require('../device-mediator/AbstMediator');
require('../format/define');

/** @abstract */
class AbstBuilder {
  constructor() {
  }


  /**
   * Create 'Commander', 'Manager'
   * @param {deviceClientConstructionInfo} config 
   * @return {{deviceCommander: AbstCommander, deviceManager: AbstManager}}
   */
  setDeviceClient(config){

  }


  // /**
  //  * Create 'Multi Commander', 'Manager'
  //  * @param {deviceClientConstructionInfo} config 
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
  //  * @param {deviceClientConstructionInfo} config 
  //  * @return {AbstCommander}
  //  */
  // addCommander(){

  // }

  // /**
  //  * Create 'Manager'
  //  * @param {deviceClientConstructionInfo} config 
  //  * @return {AbstManager}
  //  */
  // addManager(){

  // }
}

module.exports = AbstBuilder;