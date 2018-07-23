const BU = require('base-util-jh').baseUtil;

const Controller = require('./Controller.test');

const controller = new Controller();

const defaultConfig = controller.getDefaultCreateDeviceConfig();
BU.CLI(defaultConfig);

const connectType = 'serial';
if (connectType === 'serial') {
  defaultConfig.connect_type = 'serial';
  defaultConfig.target_id = 'davis_vantagepro2';
  defaultConfig.baud_rate = 19200;
  defaultConfig.port = 'COM3';
  defaultConfig.hasOneAndOne = true;
  // defaultConfig.parser.type = 'readyParser';
  // defaultConfig.parser.option = Buffer.from([0x4c, 0x4f, 0x4f, 0xc4]);
  // defaultConfig.parser.type = 'readLineParser';
  // defaultConfig.parser.option = '\n\r';
  // defaultConfig.parser.type = 'byteLengthParser';
  // defaultConfig.parser.option = 99;
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
  BU.CLI('뭐냐');
  setTimeout(() => {
    BU.CLI(controller.manager.hasConnected);
    if (controller.manager.hasConnected) {
      BU.CLI('명령 전송 준비');
      const commandInfo = controller.getDefaultCommandConfig();
      commandInfo.hasOneAndOne = true;
      commandInfo.cmdList = ['LOOP\n'];
      controller.executeCommand(commandInfo);

      setInterval(() => {
        controller.executeCommand('LOOP\n');
        controller.requestNextCommand();
      }, 1000 * 60);
    }
  }, 1000);
}
