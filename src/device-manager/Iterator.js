'use strict';
const _ = require('underscore');

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
    let rank = cmdInfo.rank;

    // BU.CLIN(cmdInfo);
    // 명령 rank가 등록되어있지 않다면 신규로 등록
    if(!_.contains(_.pluck(this.aggregate.rankList, 'rank'), rank)){
      this.aggregate.rankList.push({rank, list: [cmdInfo] });
      // BU.CLIN(this.aggregate, 4);
    } else { // 저장된 rank 객체 배열에 삽입
      let foundRank = _.findWhere(this.aggregate.rankList, {rank});
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
      // 다음 명령이 존재하지 않는다면 false
      if(this.nextRank() && this.getCurrentCmd() !== undefined){
        // BU.CLI('next rank 존재');
        return true;
      } else {
        return false;
      }
    } else {
      processInfo.currCmdIndex += 1;

      // 현재 진행중인 명령을 모두 실행하였다면 다음 순위 명령 검색 및 수행
      if(processInfo.cmdList[processInfo.currCmdIndex] === undefined){
        this.aggregate.process = {};
        return this.nextCmd();
      } else {
        return true;
      }
    }
  }

  /** 
   * 다음 진행해야할 랭크 가져옴
   * @return {boolean} 랭크가 있다면 true, 없다면 false
   */
  nextRank (){
    this.aggregate.rankList = _.sortBy(this.aggregate.rankList, rankInfo  => rankInfo.rank);

    let foundRankInfo = _.find(this.aggregate.rankList, rankInfo => {
      return rankInfo.list.length;
    });

    if(_.isEmpty(foundRankInfo)){
      this.aggregate.process = {};
      return false;
    } else {
      this.aggregate.process = foundRankInfo.list.shift();
      return true;
    }
  }

  /** 
   * 현재 진행중인 명령 초기화
   * @return {undefined}
   */
  clear (){
    this.aggregate.process = {};
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
    BU.CLIN(this.aggregate.process);
    return this.aggregate.process.cmdList[this.aggregate.process.currCmdIndex];
  }

  /** @return {AbstCommander} */
  getCurrentReceiver() {
    let currItem = this.getCurrentItem();
    return _.isEmpty(currItem) ? null : currItem.commander;
  }

  
}
module.exports = Iterator;