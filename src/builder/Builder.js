'use strict';

const _ = require('underscore');
const AbstCommander = require('../device-commander/AbstCommander');
const Commander = require('../device-commander/Commander');

const Mediator = require('../device-mediator/Mediator');


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
   * @return {AbstCommander}
   */
  addDeviceClient(config){
    try {
      let deviceCommander = this.setDeviceCommnader(config);
      let deviceManager = this.setDeviceManager(config);
  
      this.mediator.setColleague(deviceCommander, deviceManager);
  
      return deviceCommander;
    } catch (error) {
      throw error;
    }
  }


  
  /**
   * Create 'Multi Commander', 'Manager'
   * @param {deviceClientFormat} config 
   * @param {string} idList 
   * @return {Array.<AbstCommander>}
   */
  addDeviceClientGroup(config, idList){
    try {
      const commanderList = [];
      let deviceManager = this.setDeviceManager(config);
  
      idList.forEach(id => {
        config.target_id = id;
        let deviceCommander = this.setDeviceCommnader(config);
        this.mediator.setColleague(deviceCommander, deviceManager);
  
        commanderList.push(deviceCommander);
      });
  
      return commanderList;
    } catch (error) {
      throw error;
    }
  }

  /** @return {AbstMediator} */
  getMediator(){
    return this.mediator;
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
    let deviceManager = new Manager(config);

    return deviceManager;
  }

}

module.exports = Builder;