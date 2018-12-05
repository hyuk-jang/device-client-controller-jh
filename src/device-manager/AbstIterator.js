class AbstIterator {
  constructor() {}

  /**
   * 현재 진행 중인 명령 객체에 진행 할 명령이 존재하는 지
   * @return {commandInfo} 다음 명령 존재시 : true, 없을 시: false
   */
  get currentCommand() {}

  /** @return {AbstCommander} */
  get currentReceiver() {}

  /** @return {commandSet} */
  get currentCommandSet() {}

  /** @return {commandStorage} */
  get commandSetStorage() {}

  /**
   * 현재 진행 중인 명령 객체를 기준으로 다음 수행 명령이 존재하는지 체크
   * @return {boolean} 다음 명령 존재시 : true, 없을 시: false
   */
  get nextCommand() {}

  /**
   * 다음 명령 수행 집합 존재 체크
   * @return {commandStorage}
   */
  get nextCommandSet() {}

  /**
   * 현재 진행중인 명령 초기화
   * @param {dcError} dcError
   * @return {void}
   */
  clearCurrentCommandSet(dcError) {}

  /**
   * @param {commandSet} cmdInfo 추가할 명령
   */
  addCommandSet(cmdInfo) {}

  /**
   * 수행 명령 리스트에 등록된 명령을 취소
   * @param {string} commandId 명령을 취소 할 command Id
   * @return {void}
   */
  deleteCommandSet(commandId) {}

  /**
   * 현재 진행중인 명령 초기화하고 다음 명령 수행
   * @param {dcError} dcError
   * @return {void}
   */
  deleteCurrentCommandSet(dcError) {}

  /**
   * Current Process Item의 delayExecutionTimeoutMs 유무를 확인,
   * ReservedCmdList로 이동 및 Current Process Item 삭제
   * delayExecutionTimeoutMs 시간 후 Process Rank List에 shift() 처리하는 함수 바인딩 처리
   */
  moveToReservedCmdList() {}

  /**
   * standbyCommandSetList에서 검색 조건에 맞는 commandSet 를 돌려줌
   * @param {{rank: number, commandId: string}} searchInfo or 검색
   * @return {Array.<commandSet>}
   */
  findStandbyCommandSetList(searchInfo) {}

  /**
   * Reserved List에서 commandId가 동일한 commandSet 을 돌려줌
   * @param {string} commandId 명령 Id
   */
  findDelayCommandSetList(commandId) {}

  /**
   * @description 다음 진행 할 명령을 Process에 할당.
   * 다음 명령이 존재할 경우 processIndex 1 증가
   * 긴급 명령이 존재할 경우 process객체 이동 및 긴급 명령으로 교체
   * 다음 명령이 존재하지 않을 경우 getNextRank() 수행
   * getNextRank()가 존재할 경우 명령 객체 교체
   * 현재 진행 중인 명령 리스트 Index 1 증가하고 다음 진행해야할 명령 반환
   * @return {void} 다음 진행해야할 명령이 존재한다면 true, 없다면 false
   */
  changeNextCommand() {}

  /**
   * @param {{rank:number, list: Array.<commandSet>}} standbyCommandSetList
   * @return {void}
   */
  changeNextCommandSet(standbyCommandSetList) {}

  /**
   * 현재 진행중인 명령이 끝났는지 여부
   * @return {boolean}
   */
  isDone() {}
}
module.exports = AbstIterator;
