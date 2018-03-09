
const BU = require('base-util-jh').baseUtil;


const Controller = require('./Controller.test');
const controller = new Controller();


let defaultConfig = controller.getDefaultCreateDeviceConfig();
BU.CLI(defaultConfig);

defaultConfig.target_id = 'davis_vantagepro2';
defaultConfig.connect_type = 'serial';
defaultConfig.baud_rate = 9600;
defaultConfig.port = 'COM13';
defaultConfig.parser.type = 'byteLengthParser';
defaultConfig.parser.option = 55;


let resAddDevice  = controller.builder.addDeviceClient(defaultConfig, controller);
controller.commander = resAddDevice.deviceCommander;
controller.manager = resAddDevice.deviceManager;


let defaultCommandFormat = controller.getDefaultCommandFormat();
defaultCommandFormat.cmdList = [''];
// defaultCommandFormat.hasOneAndOne = true;
// BU.CLIN(controller.manager.hasConnected());

if(controller.manager.hasConnected){
  let hasExecTrue = controller.commander.executeCommand(defaultCommandFormat);
  BU.CLI(hasExecTrue);
} else {
  setTimeout(() => {
    let hasExecTrue = controller.commander.executeCommand(defaultCommandFormat);
    BU.CLI(hasExecTrue);
  }, 1000);
}
