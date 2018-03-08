
const InterfaceClient = require('./src/client/InterfaceClient');
const Builder = require('./src/builder/Builder');


module.exports = {
  Builder,
  InterfaceClient
};

// if __main process
if (require !== undefined && require.main === module) {
  console.log('main');
}
