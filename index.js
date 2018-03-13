
const AbstDeviceClient = require('./src/device-client/AbstDeviceClient');
require('./src/format/define');
require('./src/format/deviceConfig');
module.exports = AbstDeviceClient;

// if __main process
if (require !== undefined && require.main === module) {
  console.log('main');
}
