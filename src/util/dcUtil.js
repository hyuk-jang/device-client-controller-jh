const _ = require('lodash');


const AbstManager = require('../device-manager/AbstManager');

const {BU} = require('base-util-jh');



/**
 * @typedef {Object} logOption
 * @param {Object} logObj data, event, error, ...
 * @param {string} eventType event, data, error
 * @param {string=} dataTitle log event Type
 * @param {*=} data 
 */
// @param {logObj: Object, path: string, eventType: string, dataTitle: string, data:*=} logInfo

/**
 * @param {Object} logObj 객체
 * @param {string} path logObj에서 true, false를 가져올 경로
 * @param {string} eventType event, data, error
 * @param {string=} dataTitle log event Type
 * @param {*=} data 
 */
function writeLogFile(logObj, path, eventType, dataTitle, data){
  // BU.CLIS(path, eventType, dataTitle, data, _.get(logObj, path));
  if(_.get(logObj, path)){
    let id = _.get(logObj, 'id', 'etc');
    if(data === undefined){
      BU.appendFile(`./log/device-client/${eventType}/${BU.convertDateToText(new Date(), '', 2)}.txt`, `${id} : ${dataTitle}`);
    } else {
      let realData = '';
      if(Buffer.isBuffer(data)){
        realData = data.toString('hex');
      } else if(data instanceof Error){
        realData = data;
      } else if(_.isObject(data)){
        realData = JSON.stringify(data);
      } else {
        realData = data;
      }
      BU.appendFile(`./log/device-client/${eventType}/${BU.convertDateToText(new Date(), '', 2)}.txt`, `${id} : ${dataTitle} --> ${realData}`);
    }
  }
}
exports.writeLogFile = writeLogFile;


/**
 * 
 * @param {AbstManager} manager 
 * @param {*} commander 
 */
function initManager(manager, commander){
  manager.commandStorage = { currentCommandSet: {}, standbyCommandSetList: [] };
  // 반복기 생성
  manager.createIterator();
  // 명령을 받을 객체 생성
  manager.deviceController = {
    write: cmd => {
      if(_.has(cmd, 'data')){
        // BU.CLI(cmd.data);
      } else {
        // BU.CLI(cmd);
      }
      // BU.CLIN(manager);
      commander && commander.onDcData({data: `onDcData: ${cmd}`});
    },
    id: {port:3000}
  };
  /** @type {deviceClientConstructionInfo} */
  manager.config = {};
  manager.config.logOption = {
    hasCommanderResponse: true,
    hasTransferCommand: true,
    hasDcError: true,
    hasDcEvent: true,
    hasReceiveData: true
  };

  // 장치 연결자 생성
  manager.deviceController.client = {alive:true};
  // 작업중인 상태 X
  manager.hasPerformCommand = false;
  // 명령 저장소는 테스트전 청소 처리
  manager.iterator.clearAllCommandSetStorage();
}
exports.initManager = initManager;