'use strict';

const AbstCommander = require('../device-commander/AbstCommander');
const Commander = require('../device-commander/Commander');

const Mediator = require('../device-mediator/Mediator');


const AbstManager = require('../device-manager/AbstManager');
const Manager = require('../device-manager/Manager');


const AbstBuilder = require('./AbstBuilder');
 

require('../format/define');

class Builder extends AbstBuilder {
  constructor() {
    super();
    this.mediator = this.setDeviceMediator();
  }


  /**
   * Create 'Commander', 'Manager'
   * @param {deviceClientFormat} config 
   * @return {{deviceCommander: AbstCommander, deviceManager: AbstManager}}
   */
  setDeviceClient(config){
    try {
      let deviceManager = this.setDeviceManager(config);
      let deviceCommander = this.setDeviceCommnader(config);
      deviceCommander.manager = deviceManager;
  
      this.mediator.setColleague(deviceCommander, deviceManager);
  
      return {deviceCommander, deviceManager};
    } catch (error) {
      throw error;
    }
  }


  
  // /**
  //  * Create 'Multi Commander', 'Manager'
  //  * @param {deviceClientFormat} config 
  //  * @param {string} idList 
  //  * @return {{commanderList: Array.<AbstCommander>, deviceManager: AbstManager}}
  //  */
  // addDeviceClientGroup(config, idList){
  //   try {
  //     const commanderList = [];
  //     let deviceManager = this.setDeviceManager(config);
  
  //     idList.forEach(id => {
  //       config.target_id = id;
  //       let deviceCommander = this.setDeviceCommnader(config);
  //       this.mediator.setColleague(deviceCommander, deviceManager);
  
  //       commanderList.push(deviceCommander);
  //     });

      
  
  //     return {commanderList, deviceManager};
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  /** @return {AbstMediator} */
  getMediator(){
    return this.mediator;
  }

    
  /**
   * @param {deviceClientFormat} config 
   * @return {AbstCommander}
   */
  setDeviceCommnader(config) {
    let deviceCommander = new Commander(config);

    return deviceCommander;
  }

  setDeviceMediator() {
    let deviceMediator = new Mediator();

    return deviceMediator; 
  }

  /**
   * @param {deviceClientFormat} config 
   * @return {AbstManager}
   */
  setDeviceManager(config) {
    let deviceManager = new Manager();
    deviceManager.setManager(config);
    return deviceManager;
  }



  // /**
  //  * Create 'Commander'
  //  * @param {deviceClientFormat} config 
  //  * @return {AbstCommander}
  //  */
  // addCommander(config){
  //   // try {
  //   //   let deviceCommander = this.setDeviceCommnader(config);
  //   //   let deviceManager = this.setDeviceManager(config);
  
  //   //   this.mediator.setColleague(deviceCommander, deviceManager);
  //   // } catch (error) {
  //   //   throw error;
  //   // }
  // }

  // /**
  //  * Create 'Manager'
  //  * @param {deviceClientFormat} config 
  //  * @return {AbstManager}
  //  */
  // addManager(){

  // }

  



}

module.exports = Builder;