const AbstDeviceClient = require('./src/device-client/AbstDeviceClient');

require('../default-intelligence');

module.exports = AbstDeviceClient;

// if __main process
if (require !== undefined && require.main === module) {
  console.log('main');
}
