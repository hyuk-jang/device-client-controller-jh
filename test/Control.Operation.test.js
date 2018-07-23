const BU = require('base-util-jh').baseUtil;

const Controller = require('./Controller.test');

const controller = new Controller();

const defaultConfig = controller.getDefaultCreateDeviceConfig();
BU.CLI(defaultConfig);

const connectType = 'serial';
if (connectType === 'serial') {
  defaultConfig.connect_type = 'serial';
  defaultConfig.target_id = 'davis_vantagepro2';
  defaultConfig.baud_rate = 9600;
  defaultConfig.port = 'COM13';
  defaultConfig.parser.type = 'byteLengthParser';
  defaultConfig.parser.option = 55;
} else if (connectType === 'socket') {
  defaultConfig.connect_type = 'socket';
  defaultConfig.target_id = 'davis_vantagepro2';
  defaultConfig.port = 9000;
}

controller.setDeviceClient(defaultConfig);

const defaultCommandFormat = controller.getDefaultCommandConfig();
// defaultCommandFormat.cmdList = ['sss'];
// defaultCommandFormat.hasOneAndOne = true;
// BU.CLIN(controller.manager.hasConnected());

if (controller.manager.hasConnected) {
  const hasExecTrue = controller.executeCommand(defaultCommandFormat);
  BU.CLI(hasExecTrue);
} else {
  setTimeout(() => {
    if (controller.manager.hasConnected) {
      let hasExecTrue = controller.executeCommand(defaultCommandFormat);
      hasExecTrue = controller.executeCommand(defaultCommandFormat);
      hasExecTrue = controller.executeCommand(defaultCommandFormat);
      BU.CLI(hasExecTrue);
    }
  }, 1000);
}
