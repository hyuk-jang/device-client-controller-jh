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
   * @param {commandFormat} cmdInfo 추가할 명령
   */
  addCmd(cmdInfo) {
    // BU.CLI(cmdInfo);
    let rank = cmdInfo.rank;
    // BU.CLI(this.aggregate);
    // BU.CLIN(cmdInfo);
    // 명령 rank가 등록되어있지 않다면 신규로 등록
    if(!_.includes(_.map(this.aggregate.rankList, 'rank'), rank)){
      this.aggregate.rankList.push({rank, list: [cmdInfo] });
      // BU.CLIN(this.aggregate, 4);
    } else { // 저장된 rank 객체 배열에 삽입
      let foundRank = _.find(this.aggregate.rankList, {rank});
      foundRank.list.push(cmdInfo);
    }
    // BU.CLIN(this.aggregate, 4);
  }

  /** 
   * 현재 진행 중인 명령 리스트 Index 1 증가하고 다음 진행해야할 명령 반환 
   * @return {boolean} 다음 진행해야할 명령이 존재한다면 true, 없다면 false
   */
  nextCmd (){
    const processInfo = this.aggregate.process;
    // 현재 진행중인 명령이 비어있다면 다음 순위 명령을 가져옴
    if(_.isEmpty(processInfo)){
      // 다음 명령이 존재할 경우
      if(this.nextRank()){
        // 현재 명령에서 명령을 수행할 수 없다면 다음 rank를 찾음
        if(this.getCurrentCmd() === undefined){
          return this.nextRank();
        } else {  // 정상적인 명령을 수행 할 수 있을 경우 --> 다음 명령 수행 가능(true) 반환
          return true;
        }
      } else {  // 다음 명령이 존재하지 않을 경우 --> 모든 명령 수행(false) 및 탐색 종료 
        return false;
      }
    } else {
      processInfo.currCmdIndex += 1;

      // 현재 진행중인 명령을 모두 실행하였다면 다음 순위 명령 검색 및 수행
      if(processInfo.cmdList[processInfo.currCmdIndex] === undefined){
        this.aggregate.process = {};
        return this.nextCmd();
      } else {
        // 현재 진행중인 명령이 긴급 명령(Rank 0)이 아니라면 명령 교체
        let rank = this.getCurrentItem().rank;
        if(rank !== 0){
          // 해당 Rank를 찾음
          let foundIt = _.find(this.aggregate.rankList, {rank});
          // 맨 앞에 등록
          foundIt.list.unshift(processInfo);
          this.aggregate.process = {};
          return this.nextRank();
        } else {
          return true;
        }
      }
    }
  }

  /** 
   * 다음 진행해야할 랭크 가져옴
   * @return {boolean} 랭크가 있다면 true, 없다면 false
   */
  nextRank (){
    this.aggregate.rankList = _.sortBy(this.aggregate.rankList, 'rank');
    // 다음 순위의 명령 집합을 찾음
    let foundRankInfo = _.find(this.aggregate.rankList, rankInfo => {
      return rankInfo.list.length;
    });
    // 명령이 존재하지 않을 경우
    if(_.isEmpty(foundRankInfo)){
      this.aggregate.process = {};
      return false;
    } else {  // 명령 집합에서 첫번째 목록을 process로 가져오고 해당 배열에서 제거
      this.aggregate.process = foundRankInfo.list.shift();
      return true;
    }
  }

  /** 
   * 현재 진행중인 명령 초기화
   * @return {undefined}
   */
  clearItem (){
    this.aggregate.process = {};
  }

  /** 모든 명령을 초기화 */
  clearAllItem() {
    this.clearItem();
    _.forEach(this.aggregate.rankList, item => {
      item.list = [];
    });
  }

  /**
   * 현재 진행중인 명령이 끝났는지 여부
   * @return {boolean} 
   */
  isDone (){
    const processInfo = this.aggregate.process;

    const nextIndex = processInfo.currCmdIndex + 1;
    if(_.isEmpty(processInfo)){
      return false;
    } else {
      return processInfo.cmdList[nextIndex] === undefined;
    }
  }


  /** @return {commandFormat} */
  getCurrentItem (){
    return this.aggregate.process;
  }

  /** @return {commandStorage} */
  getAllItem() {
    return this.aggregate;
  }

  /** @return {*=} */
  getCurrentCmd() {
    // BU.CLIN(this.aggregate.process);
    return this.aggregate.process.cmdList[this.aggregate.process.currCmdIndex];
  }

  /** @return {AbstCommander} */
  getCurrentReceiver() {
    let currItem = this.getCurrentItem();
    return _.isEmpty(currItem) ? null : currItem.commander;
  }

  
}
module.exports = Iterator;