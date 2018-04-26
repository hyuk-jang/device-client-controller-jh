'use strict';
const _ = require('lodash');

const {BU, CU} = require('base-util-jh');

const Manager = require('./Manager');
const AbstCommander = require('../device-commander/AbstCommander');

const {definedOperationStatus, definedCommandSetRank} = require('../format/moduleDefine');
require('../format/define');

class Iterator {
  /** @param {Manager} deviceManager */
  constructor(deviceManager) {
    this.manager = deviceManager;
    /** @type {commandStorage}*/
    this.aggregate = deviceManager.commandStorage;
    this.aggregate.currentCommandSet = {};
    this.aggregate.standbyCommandSetList = [];
    this.aggregate.delayCommandSetList = [];
  }

  /**
   * 현재 진행 중인 명령 객체에 진행 할 명령이 존재하는 지
   * @return {commandInfo} 다음 명령 존재시 : true, 없을 시: false
   */
  get currentCommand() {
    const currentCommandSet = this.currentCommandSet;
    if(_.isEmpty(currentCommandSet)){
      return null;
    } else if(_.has(currentCommandSet, 'currCmdIndex') && _.has(currentCommandSet, 'cmdList')) {
      const cmd = currentCommandSet.cmdList[currentCommandSet.currCmdIndex];
      return cmd === undefined || cmd === '' || _.isEmpty(cmd) ? null : cmd;
    } else {
      return null;
    }
  }

  /** @return {AbstCommander} */
  get currentReceiver() {
    let currItem = this.currentCommandSet;
    return _.isEmpty(currItem) || _.isEmpty(currItem.commander) ? null : currItem.commander;
  }

  /** @return {commandFormat} */
  get currentCommandSet (){
    return this.aggregate.currentCommandSet;
  }
  
  /** @return {commandStorage} */
  get commandSetStorage() {
    return this.aggregate;
  }
  
  /**
   * 현재 진행 중인 명령 객체를 기준으로 다음 수행 명령이 존재하는지 체크
   * @return {boolean} 다음 명령 존재시 : true, 없을 시: false
   */
  get nextCommand() {
    try {
      const currentCommandSet = this.currentCommandSet;
      if(_.isEmpty(currentCommandSet)){
        return null;
      } else {
        const nextIndex = currentCommandSet.currCmdIndex + 1;
        const cmd = currentCommandSet.cmdList[nextIndex];
        return cmd === undefined || cmd === '' || _.isEmpty(cmd) ? null : cmd;
      }
    } catch (error) {
      return null;     
    }
  }

  /**
   * 다음 명령 수행 집합 존재 체크
   * @return {commandStorage} 
   */
  get nextCommandSet() {
    // Rank를 지정했다면
    // BU.CLI(this.aggregate);
    let foundRankInfo = _.find(this.aggregate.standbyCommandSetList, rankInfo => {
      return rankInfo.list.length;
    });
    return _.isEmpty(foundRankInfo) ? {} : foundRankInfo;
  }

  /** 
   * @param {commandFormat} cmdInfo 추가할 명령
   */
  addCmd(cmdInfo) {
    // BU.CLI(cmdInfo);
    let rank = cmdInfo.rank;
    // BU.CLIN(cmdInfo);
    // 명령 rank가 등록되어있지 않다면 신규로 등록
    if(!_.includes(_.map(this.aggregate.standbyCommandSetList, 'rank'), rank)){
      this.aggregate.standbyCommandSetList.push({rank, list: [cmdInfo] });
      // rank 순으로 정렬
      this.aggregate.standbyCommandSetList = _.sortBy(this.aggregate.standbyCommandSetList, 'rank');
      // BU.CLIN(this.aggregate, 4);
    } else { // 저장된 rank 객체 배열에 삽입
      let foundRank = _.find(this.aggregate.standbyCommandSetList, {rank});
      foundRank.list.push(cmdInfo);
    }
    // BU.CLIN(this.aggregate, 4);
  }


  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {void}
   */
  deleteCmd(commandId){
    // BU.CLI('deleteCmd 수행', commandId);
    // 명령 대기 리스트 삭제
    this.aggregate.standbyCommandSetList.forEach(rank => {
      _.remove(rank.list, {commandId});
    });

    // 명령 예약 리스트 삭제
    this.aggregate.delayCommandSetList = _.reject(this.aggregate.delayCommandSetList, cmdInfo => {
      if(cmdInfo.commandId === commandId){
        cmdInfo.commandQueueReturnTimer && cmdInfo.commandQueueReturnTimer.pause();
      }
    });

    // 현재 명령을 삭제 요청 할 경우 시스템에 해당 명령 삭제 상태로 교체
    if(this.currentCommandSet.commandId === commandId){
      this.aggregate.currentCommandSet.operationStatus = definedOperationStatus.REQUEST_DELETE;
    }
  }

  /** 
   * Current Process Item의 delayExecutionTimeoutMs 유무를 확인,
   * ReservedCmdList로 이동 및 Current Process Item 삭제
   * delayExecutionTimeoutMs 시간 후 Process Rank List에 shift() 처리하는 함수 바인딩 처리
   */
  moveToReservedCmdList() {
    const currentCommandSet = this.currentCommandSet;
    const currentCommand = this.currentCommand;

    // delayExecutionTimeoutMs 가 존재 할 경우만 수행
    if(_.isNumber(currentCommand.delayExecutionTimeoutMs)){
      // 지연 복귀 타이머 설정
      currentCommandSet.commandQueueReturnTimer = new CU.Timer(() => {
        // Delay Time 해제
        delete(currentCommand.delayExecutionTimeoutMs);
        // currentCommand.delayExecutionTimeoutMs = null;
        let foundIt = _.remove(this.aggregate.delayCommandSetList, reservedCmdInfo => _.isEqual(reservedCmdInfo, currentCommandSet));
        if(foundIt.length){
          // delay 가 종료되었으로 해당 Rank의 맨 선두에 배치
          let foundRank = _.find(this.aggregate.standbyCommandSetList, {rank:currentCommandSet.rank});
          if(_.isObject(foundRank)){
            foundRank.list.unshift(_.first(foundIt));
            // 명령 제어 실행 체크 요청
            this.manager.manageProcessingCommand();
          }
        } else {
          BU.CLI('해당 명령은 삭제되었습니다.', currentCommandSet.commandId);
        }
      }, currentCommand.delayExecutionTimeoutMs);
      // 지연 복귀 명령 집합으로 이동
      this.aggregate.delayCommandSetList.push(currentCommandSet);
      // 진행 중인 명령 집합 초기화
      this.aggregate.currentCommandSet = {};
    } else {
      throw new Error(currentCommandSet.commandId + '는 delayMs를 가지고 있지 않습니다.');
    }
  }

  /**
   * standbyCommandSetList에서 검색 조건에 맞는 commandFormat 를 돌려줌
   * @param {{rank: number, commandId: string}} searchInfo or 검색
   * @return {Array.<commandFormat>}
   */
  findStandbyCommandSetList(searchInfo) {
    // BU.CLI('findStandbyCommandSetList', searchInfo);
    let returnValue = [];

    // searchInfo.rank가 숫자고 해당 Rank가 등록되어 있다면 검색 수행
    if(_.isNumber(searchInfo.rank)){
      let fountIt =_.chain(this.aggregate.standbyCommandSetList)
        .find({rank: searchInfo.rank})
        .get('list')
        .value();

      returnValue = _.isArray(fountIt) ? _.concat(returnValue, fountIt) : returnValue;
    }

    if(_.isString(searchInfo.commandId) && searchInfo.commandId){
      _.forEach(this.aggregate.standbyCommandSetList, rankInfo => {
        let foundIt = _.filter(rankInfo.list, {commandId: searchInfo.commandId});
        returnValue = _.concat(returnValue, foundIt);
      });
    }
    return _.union(returnValue);
  }

  /**
   * Reserved List에서 commandId가 동일한 commandFormat 을 돌려줌
   * @param {string} commandId 명령 Id
   */
  findDelayCommandSetList(commandId){
    return _.find(this.aggregate.delayCommandSetList, {commandId});
  }
  
  /**
   * @description 다음 진행 할 명령을 Process에 할당. 
   * 다음 명령이 존재할 경우 processIndex 1 증가
   * 긴급 명령이 존재할 경우 process객체 이동 및 긴급 명령으로 교체
   * 다음 명령이 존재하지 않을 경우 getNextRank() 수행
   * getNextRank()가 존재할 경우 명령 객체 교체
   * 현재 진행 중인 명령 리스트 Index 1 증가하고 다음 진행해야할 명령 반환 
   * @return {void} 다음 진행해야할 명령이 존재한다면 true, 없다면 false
   */
  changeNextCommand (){
    BU.CLI('changeNextCommand');
    try {
      const currentCommandSet = this.currentCommandSet;
      // 현재 진행중인 명령이 비어있다면 다음 순위 명령을 가져옴
      if(_.isEmpty(currentCommandSet) || this.nextCommand === null){
        // BU.CLI('다음 명령이 존재하지 않죠?', this.nextCommand);
        // 다음 명령이 존재할 경우
        let nextCommandSet = this.nextCommandSet;
        // 다음 수행할 Rank가 없다면 false 반환
        if(_.isEmpty(nextCommandSet)){
          throw new ReferenceError('다음 명령이 존재하지 않습니다.');
        } else {
          return this.changeNextCommandSet(nextCommandSet);
        }
      } else {
        // 명령 인덱스 증가
        currentCommandSet.currCmdIndex += 1;
        // 현재 진행중인 명령의 우선 순위를 체크
        let currentSetRank = this.currentCommandSet.rank;
        // 현재 진행중인 명령이 긴급 명령(Rank 0)이 아니라면 긴급 명령이 존재하는지 체크
        if(currentSetRank !== definedCommandSetRank.EMERGENCY && _.isNumber(currentSetRank)){
          let foundList = this.findStandbyCommandSetList({rank: definedCommandSetRank.EMERGENCY});
          // 만약 긴급 명령이 존재한다면
          if(foundList.length){
            // 진행 중인 자료를 이동
            let currProcessStorage = _.find(this.aggregate.standbyCommandSetList, {rank:currentSetRank} );
            currProcessStorage.list.unshift(currentCommandSet);
            return this.changeNextCommandSet();
          }
        } 
      }
    } catch (error) {
      throw error;
    }
  }

  /** 
   * @param {{rank:number, list: Array.<commandFormat>}} standbyCommandSetList
   * @return {void} 
   */
  changeNextCommandSet (standbyCommandSetList){
    BU.CLI('changeNextCommandSet');
    if(standbyCommandSetList === undefined){
      standbyCommandSetList = _.find(this.aggregate.standbyCommandSetList, rankInfo => {
        return rankInfo.list.length;
      });
    }
    // 명령이 존재하지 않을 경우
    if(_.isEmpty(standbyCommandSetList)){
      this.clearCurrentCommandSet();
      throw new ReferenceError('다음 명령이 존재하지 않습니다.');
    } else {  // 명령 집합에서 첫번째 목록을 process로 가져오고 해당 배열에서 제거
      this.aggregate.currentCommandSet = standbyCommandSetList.list.shift();
    }
  }

  /** 
   * 현재 진행중인 명령 초기화
   * @param {{eventName: string, eventMsg: Error}} event
   * @return {void}
   */
  clearCurrentCommandSet (event){
    let currentCommandSet = this.currentCommandSet;

    if(!_.isEmpty(currentCommandSet)){
      // 이벤트가 존재하고 받을 대상이 있다면 전송
      event.eventName.length && this.currentReceiver && this.currentReceiver.updateDcEvent(event);
      currentCommandSet.commandExecutionTimer.
        currentCommandSet.commandExecutionTimer && currentCommandSet.commandExecutionTimer.pause();
    }

    this.aggregate.currentCommandSet = {};
  }

  /** 모든 명령을 초기화 */

  /**
   * 모든 명령을 초기화
   * param 값에 따라 Commander에게 초기화 하는 이유를 보냄.
   * @param {{hasEvent:boolean, eventName: string, eventMsg: Error}} option
   */
  clearAllCommandSetStorage(event) {
    // 현재 수행중인 명령 삭제
    this.clearCurrentCommandSet(event);

    // 명령 대기열에 존재하는 명령 삭제
    _.forEach(this.aggregate.standbyCommandSetList, item => {
      _.dropWhile(item.list, commandInfo => {
        event.eventName.length && commandInfo.commander && commandInfo.commander.updateDcEvent(event);
        return true;
      });
    });

    // 지연 명령 대기열에 존재하는 명령 삭제
    _.dropWhile(this.aggregate.delayCommandSetList, commandInfo => {
      commandInfo.commandQueueReturnTimer && commandInfo.commandQueueReturnTimer.pause();
      event.eventName.length && commandInfo.commander && commandInfo.commander.updateDcEvent(event);
      return true;
    });
  }

  /**
   * 현재 진행중인 명령이 끝났는지 여부
   * @return {boolean} 
   */
  isDone (){
    return this.currentCommand === null || this.nextCommand === null ? true : false;
  }

}
module.exports = Iterator;