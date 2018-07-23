const AbstCommander = require('../device-commander/AbstCommander');
const Commander = require('../device-commander/Commander');

const Mediator = require('../device-mediator/Mediator');

const AbstManager = require('../device-manager/AbstManager');
const Manager = require('../device-manager/Manager');

const AbstBuilder = require('./AbstBuilder');

class Builder extends AbstBuilder {
  constructor() {
    super();
    this.mediator = this.setDeviceMediator();
  }

  /**
   * Create 'Commander', 'Manager'
   * @param {deviceInfo} config
   * @return {{deviceCommander: AbstCommander, deviceManager: AbstManager}}
   */
  setDeviceClient(config) {
    try {
      const deviceManager = this.setDeviceManager(config);
      const deviceCommander = this.setDeviceCommnader(config);
      deviceCommander.manager = deviceManager;

      this.mediator.setColleague(deviceCommander, deviceManager);

      return {deviceCommander, deviceManager};
    } catch (error) {
      throw error;
    }
  }

  // /**
  //  * Create 'Multi Commander', 'Manager'
  //  * @param {deviceInfo} config
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
  getMediator() {
    return this.mediator;
  }

  /**
   * @param {deviceInfo} config
   * @return {AbstCommander}
   */
  setDeviceCommnader(config) {
    const deviceCommander = new Commander(config);

    return deviceCommander;
  }

  setDeviceMediator() {
    const deviceMediator = new Mediator();

    return deviceMediator;
  }

  /**
   * @param {deviceInfo} config
   * @return {AbstManager}
   */
  setDeviceManager(config) {
    const deviceManager = new Manager();
    return deviceManager.setManager(config);
    // return deviceManager;
  }

  // /**
  //  * Create 'Commander'
  //  * @param {deviceInfo} config
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
  //  * @param {deviceInfo} config
  //  * @return {AbstManager}
  //  */
  // addManager(){

  // }
}

module.exports = Builder;
