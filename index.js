

const Builder = require('./src/builder/Builder');


module.exports = Builder;

// if __main process
if (require !== undefined && require.main === module) {
  console.log('main');
}
