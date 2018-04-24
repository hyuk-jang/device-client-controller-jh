'use strict';
const _ = require('lodash');

const BU = require('base-util-jh').baseUtil;

const AbstCommander = require('../device-commander/AbstCommander');

require('../format/define');

class Iterator {
  /** @param {DeviceManager} deviceManager */
  constructor(deviceManager) {
    /** @type {commandStorage}*/
    this.aggregate = deviceManager.commandStorage;
  }

  /**
   * 현재 진행 중인 명령 객체에 진행 할 명령이 존재하는 지
   * @return {commandInfo} 다음 명령 존재시 : true, 없을 시: false
   */
  get currentCmd() {
    const processInfo = this.aggregate.processWork;
    if(_.isEmpty(processInfo)){
      return undefined;
    } else {
      return _.has(processInfo, 'currCmdIndex') && _.has(processInfo, 'cmdList') ? processInfo.cmdList[processInfo.currCmdIndex] : undefined;
    }
  }

  /** @return {AbstCommander} */
  get currentReceiver() {
    let currItem = this.currentItem;
    return _.isEmpty(currItem) || _.isEmpty(currItem.commander) ? undefined : currItem.commander;
  }

  /** @return {commandFormat} */
  get currentItem (){
    return this.aggregate.processWork;
  }
  
  /** @return {commandStorage} */
  get allItem() {
    return this.aggregate;
  }
  
  /**
   * 현재 진행 중인 명령 객체를 기준으로 다음 수행 명령이 존재하는지 체크
   * @return {boolean} 다음 명령 존재시 : true, 없을 시: false
   */
  get nextCmd() {
    const processInfo = this.aggregate.processWork;
  
    const nextIndex = processInfo.currCmdIndex + 1;
    return _.isEmpty(processInfo) ? undefined : processInfo.cmdList[nextIndex];
  }

  /**
   * 다음 명령 수행 집합 존재 체크
   * @return {commandStorage} 
   */
  get nextRank() {
    // Rank를 지정했다면
    // BU.CLI(this.aggregate);
    let foundRankInfo = _.find(this.aggregate.rankList, rankInfo => {
      return rankInfo.list.length;
    });
    return _.isEmpty(foundRankInfo) ? undefined : foundRankInfo;
  }

  /** 
   * @param {commandFormat} cmdInfo 추가할 명령
   */
  addCmd(cmdInfo) {
    // BU.CLI(cmdInfo);
    let rank = cmdInfo.rank;
    // BU.CLIN(cmdInfo);
    // 명령 rank가 등록되어있지 않다면 신규로 등록
    if(!_.includes(_.map(this.aggregate.rankList, 'rank'), rank)){
      this.aggregate.rankList.push({rank, list: [cmdInfo] });
      // rank 순으로 정렬
      this.aggregate.rankList = _.sortBy(this.aggregate.rankList, 'rank');
      // BU.CLIN(this.aggregate, 4);
    } else { // 저장된 rank 객체 배열에 삽입
      let foundRank = _.find(this.aggregate.rankList, {rank});
      foundRank.list.push(cmdInfo);
    }
    // BU.CLIN(this.aggregate, 4);
  }


  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {boolean} 현재 진행 중인 명령까지 삭제했다면 true, 예약 리스트만 삭제했다면 false
   */
  deleteCmd(commandId){
    // BU.log('deleteCmd 수행', commandId);
    // 명령 대기 리스트 삭제
    this.aggregate.rankList.forEach(rank => {
      _.remove(rank.list, {commandId});
    });

    // 명령 예약 리스트 삭제
    this.aggregate.reservedList = _.reject(this.aggregate.reservedList, cmdInfo => {
      if(cmdInfo.commandId === commandId){
        clearTimeout(cmdInfo.delayTimeout);
        return true;
      } else {
        return false;
      }
    });

    if(this.aggregate.processWork.commandId === commandId){
      clearTimeout(this.currentItem.timer);
      this.aggregate.processWork = {};
      return true;
    } else {
      return false;
    }
  }

  /** 
   * Current Process Item의 delayMs 유무를 확인,
   * ReservedCmdList로 이동 및 Current Process Item 삭제
   * delayMs 시간 후 Process Rank List에 shift() 처리하는 함수 바인딩 처리
   */
  moveToReservedCmdList() {
    const cmdInfo = this.currentItem;
    const currCmd = this.currentCmd;

    // delayMs 가 존재 할 경우만 수행
    if(_.isNumber(currCmd.delayMs)){
      cmdInfo.delayTimeout = setTimeout(() => {
        // Delay Time 해제
        currCmd.delayMs = null;
        let foundIt = _.remove(this.aggregate.reservedList, reservedCmdInfo => _.isEqual(reservedCmdInfo, cmdInfo));
        if(_.isEmpty(foundIt)){
          BU.CLI('해당 명령은 삭제되었습니다.', cmdInfo.commandId);
        } else {
          // delay 가 종료되었으로 해당 Rank의 맨 선두에 배치
          let foundRank = _.find(this.aggregate.rankList, {rank:cmdInfo.rank});
          foundRank.list.unshift(foundIt);
          let currItem = this.currentItem;
          // 현재 수행할 명령이 존재하지 않는다면 Manager의 nextCommand()를 호출
          if(currItem === null || currItem === undefined || _.isEmpty(currItem)){
            return this.nextCommand();
          }
        }
      }, currCmd.delayMs);
    } else {
      throw new Error(cmdInfo.commandId + '는 delayMs를 가지고 있지 않습니다.');
    }


    // // 지정 시간만큼 Delay를 저장
    // const delayMs = this.getCurrentCmd().delayMs;

    // // Delay Time 해제
    // this.getCurrentCmd().delayMs = null;

    
  }



  /**
   * RankList에서 검색 조건에 맞는 commandFormat 를 돌려줌
   * @param {{rank: number, commandId: string}} searchInfo or 검색
   * @return {Array.<commandFormat>}
   */
  findRankList(searchInfo) {
    let returnValue = [];

    if(_.isNumber(searchInfo.rank)){
      returnValue = _.concat(returnValue, _.find(this.aggregate.rankList, {rank:searchInfo.rank}).list); 
    }

    if(_.isString(searchInfo.commandId) && searchInfo.commandId){
      _.forEach(this.aggregate.rankList, rankInfo => {
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
  findReservedList(commandId){
    return _.find(this.aggregate.reservedList, {commandId});
  }
  
  /**
   * @description 다음 진행 할 명령을 Process에 할당. 
   * 다음 명령이 존재할 경우 processIndex 1 증가
   * 긴급 명령이 존재할 경우 process객체 이동 및 긴급 명령으로 교체
   * 다음 명령이 존재하지 않을 경우 getNextRank() 수행
   * getNextRank()가 존재할 경우 명령 객체 교체
   * 
   * 현재 진행 중인 명령 리스트 Index 1 증가하고 다음 진행해야할 명령 반환 
   * @return {boolean} 다음 진행해야할 명령이 존재한다면 true, 없다면 false
   */
  changeNextCmd (){
    const processInfo = this.aggregate.processWork;
    // 현재 진행중인 명령이 비어있다면 다음 순위 명령을 가져옴
    if(_.isEmpty(processInfo)){
      // 다음 명령이 존재할 경우
      let nextRank = this.nextRank;
      // 다음 수행할 Rank가 없다면 false 반환
      if(nextRank === undefined){
        return false;
      } else {
        return this.changeNextRank(nextRank);
      }
    } else {
      // 명령 인덱스 증가
      processInfo.currCmdIndex += 1;
      // 현재 진행중인 명령을 모두 실행하였다면 다음 순위 명령 검색 및 수행
      if(processInfo.cmdList[processInfo.currCmdIndex] === undefined){
        let nextRank = this.nextRank;
        // 다음 수행할 Rank가 없다면 false 반환
        if(nextRank === undefined){
          return false;
        } else {
          return this.changeNextRank(nextRank);
        }
      } else {
        // 현재 진행중인 명령의 우선 순위를 체크
        let rank = this.currentItem.rank;
        
        // 현재 진행중인 명령이 긴급 명령(Rank 0)이 아니라면 긴급 명령이 존재하는지 체크
        if(rank !== 0){
          let foundList = _.isNumber(rank) ? this.findRankList({rank: 0}) : [];
          BU.CLI(foundList);

          // 만약 긴급 명령이 존재하지 않는다면
          if(foundList.length === 0){
            return true;
          } else {
            // 진행 중인 자료를 이동
            let currProcessStorage = _.find(this.aggregate.rankList, {rank} );
            currProcessStorage.list.unshift(processInfo);
            return this.changeNextRank();
          }
        } else {
          return true;
        }
      }
    }
  }

  /** 
   * @param {{rank:number, list: Array.<commandFormat>}} rankList
   * @return {boolean} 랭크가 있다면 true, 없다면 false
   */
  changeNextRank (rankList){
    BU.CLI('changeNextRank', rankList);
    if(rankList === undefined){
      rankList = _.find(this.aggregate.rankList, rankInfo => {
        return rankInfo.list.length;
      });
    }
    // 명령이 존재하지 않을 경우
    if(_.isEmpty(rankList)){
      this.aggregate.processWork = {};
      return false;
    } else {  // 명령 집합에서 첫번째 목록을 process로 가져오고 해당 배열에서 제거
      this.aggregate.processWork = rankList.list.shift();
      return true;
    }
  }

  /** 
   * 현재 진행중인 명령 초기화
   * @return {undefined}
   */
  clearProcessItem (){
    this.aggregate.processWork = {};
  }

  /** 모든 명령을 초기화 */
  clearAllItem() {
    this.clearProcessItem();
    _.forEach(this.aggregate.rankList, item => {
      item.list = [];
    });
  }

  /**
   * 현재 진행중인 명령이 끝났는지 여부
   * @return {boolean} 
   */
  isDone (){
    return this.nextCmd === undefined ? true : false;
  }


  





  
}
module.exports = Iterator;