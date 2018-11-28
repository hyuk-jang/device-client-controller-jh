const _ = require('lodash');
const { BU, CU } = require('base-util-jh');

const AbstManager = require('../device-manager/AbstManager');

// @param {logObj: Object, path: string, eventType: string, dataTitle: string, data:*=} logInfo

/**
 * @param {Object} logObj 객체
 * @param {string} path logObj에서 true, false를 가져올 경로
 * @param {string} eventType event, data, error
 * @param {string=} dataTitle log event Type
 * @param {*=} data
 */
async function writeLogFile(logObj, path, eventType, dataTitle, data) {
  // BU.CLIS(path, eventType, dataTitle, data, _.get(logObj, path));
  let filePath = BU.convertDateToText(new Date(), '', 2);

  if (_.get(logObj, path)) {
    let id = _.get(logObj, 'id', 'etc');
    if (_.isObject(id)) {
      id = _.get(logObj, 'iterator.currentReceiver.id', '');
    }

    if (eventType === 'event') {
      const observerList = _.get(logObj, 'observers', []);
      const idList = _.union(observerList.map(observer => _.get(observer, 'id', '')));
      id = JSON.stringify(idList);
    } else if (
      dataTitle === 'onData' ||
      dataTitle === 'transferData' ||
      dataTitle === 'commanderResponse'
    ) {
      const commanderId = _.get(logObj, 'iterator.currentReceiver.id', '');
      filePath = `${id}/${filePath}`;
      id = `M: ${id}\tC: ${commanderId}`;
    }

    if (data === undefined) {
      BU.appendFile(
        `./log/device-client/${eventType}/${BU.convertDateToText(new Date(), '', 2)}.log`,
        `${id} : ${dataTitle}`,
      );
    } else {
      let realData = '';

      if (Buffer.isBuffer(data)) {
        // // FIXME: Hex 파일 형태로 저장할 경우 보완
        // if(eventType === 'data' && dataTitle === 'onData'){
        //   let bufData = Buffer.concat([Buffer.from(BU.convertDateToText(new Date(), null, 2)), Buffer.from(`${id}>`), data, Buffer.from('<')]);
        //   BU.writeFile(`./log/device-client/${eventType}/${BU.convertDateToText(new Date(), '', 2)}.hex`, bufData);
        // }
        // realData = data.toString('hex');

        realData = data.toString();
        // xbee 저장
        if (eventType === 'data' && dataTitle === 'onData' && BU.IsJsonString(realData)) {
          const parseData = JSON.parse(realData);
          // BU.CLI(parseData);
          if (_.get(parseData, 'data.type') === 'Buffer') {
            parseData.data = Buffer.from(parseData.data).toString();
            realData = JSON.stringify(parseData);
          }
        } else {
          realData = data.toString('hex');
        }
      } else if (data instanceof Error) {
        realData = data;
      } else if (Buffer.isBuffer(_.get(data, 'data'))) {
        // xbee
        realData = _.clone(data);
        realData.data = realData.data.toString();
        realData = JSON.stringify(realData);
      } else if (_.isObject(data)) {
        // if(_.get(realData, 'data.type') === 'Buffer') {}
        realData = JSON.stringify(data);
      } else {
        realData = data;
      }
      const isWrite = await BU.appendFile(
        `./log/device-client/${eventType}/${filePath}.log`,
        `${id} : ${dataTitle} --> ${realData}`,
      );

      return isWrite;
    }
  }
}
exports.writeLogFile = writeLogFile;

/**
 *
 * @param {AbstManager} manager
 * @param {*} commander
 */
function initManager(manager, commander) {
  manager.commandStorage = { currentCommandSet: {}, standbyCommandSetList: [] };
  // 반복기 생성
  manager.createIterator();
  // 명령을 받을 객체 생성
  manager.deviceController = {
    write: cmd => {
      if (_.has(cmd, 'data')) {
        // BU.CLI(cmd.data);
      } else {
        // BU.CLI(cmd);
      }
      // BU.CLIN(manager);
      commander && commander.onDcData({ data: `onDcData: ${cmd}` });
    },
    id: { port: 3000 },
  };
  /** @type {deviceInfo} */
  manager.config = {};
  manager.config.logOption = {
    hasCommanderResponse: true,
    hasTransferCommand: true,
    hasDcError: true,
    hasDcEvent: true,
    hasReceiveData: true,
  };

  // 장치 연결자 생성
  manager.deviceController.client = { alive: true };
  // 작업중인 상태 X
  manager.hasPerformCommand = false;
  // 명령 저장소는 테스트전 청소 처리
  manager.iterator.clearAllCommandSetStorage();
}
exports.initManager = initManager;

/**
 * @return {controlInfo}
 */
function getDefaultControlInfo() {
  return {
    hasOneAndOne: false,
    hasReconnect: false,
    hasErrorHandling: false,
  };
}
exports.getDefaultControlInfo = getDefaultControlInfo;

/**
 * @return {logOption}
 */
function getDefaultLogOption() {
  return {
    hasCommanderResponse: false,
    hasDcError: false,
    hasDcEvent: false,
    hasDcMessage: false,
    hasReceiveData: false,
    hasTransferCommand: false,
  };
}
exports.getDefaultLogOption = getDefaultLogOption;
