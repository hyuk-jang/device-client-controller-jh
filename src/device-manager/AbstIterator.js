'use strict';
require('../format/define');
class AbstIterator {
  constructor() {
  }
  /** 
   * @param {commandFormat} cmdInfo 추가할 명령
   */
  addCmd(cmdInfo) {}

  /** 
   * 현재 진행 중인 명령 리스트 Index 1 증가하고 다음 진행해야할 명령 반환 
   * @return {boolean} 다음 진행해야할 명령이 존재한다면 true, 없다면 false
   */
  nextCmd (){
  }
  /** 
   * 다음 진행해야할 랭크 가져옴
   * @return {boolean} 랭크가 있다면 true, 없다면 false
   */
  nextRank (){
  }

  /** 
   * 현재 진행중인 명령 초기화
   * @return {undefined}
   */
  clear (){
  }

  // TODO
  /**
   * 모든 명령을 수행하였을 경우
   */
  isDone (){
  }

  /** @return {commandFormat} */
  getCurrentItem (){}

  /** @return {commandStorage} */
  getAllItem() {}

  /** @return {*=} */
  getCurrentCmd(){}

  /** @return {AbstCommander} */
  getCurrentReceiver(){}
}
module.exports = AbstIterator;