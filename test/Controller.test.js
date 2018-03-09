
const AbstDeviceClient = require('../src/client/AbstDeviceClient');
const Builder = require('../src/builder/Builder');


class Control extends AbstDeviceClient {
  constructor() {
    super();


    this.builder = new Builder();


    // this.builder.addDeviceClient();

    

  }
}

module.exports = Control;




