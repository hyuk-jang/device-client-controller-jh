
const AbstDeviceClient = require('./src/client/AbstDeviceClient');
const Builder = require('./src/builder/Builder');


module.exports = {
  Builder,
  AbstDeviceClient
};

// if __main process
if (require !== undefined && require.main === module) {
  console.log('main');
}
