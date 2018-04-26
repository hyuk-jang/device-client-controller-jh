exports.definedOperationStatus = {
  /**
   * @type {number} Wait(Default)
   * @desc 명령 대기 상태
   */
  WAIT: 0,
  /**
   * @type {number} Request Command
   * @desc 명령 요청 상태 (진행 중)
   */
  REQUEST_CMD: 1,
  /**
   * @type {number} Request Delay
   * @desc 명령 요청 상태 (진행 중)
   */
  REQUEST_DELAY: 2,
  /**
   * @type {number} Response Success
   * @desc 명령 요청 처리 성공
   */
  RESPONE_SUCCESS: 3,
  /**
   * @type {number} Request Delete Current Command Set
   * @desc 현재 명령 셋 삭제 요청 상태
   */
  REQUEST_DELETE: 4,
  /**
   * @type {number} Error Timeout
   * @desc 응답 시간 초과
   */
  E_TIMEOUT: 5,
  /**
   * @type {number} Error Retry Count Full
   * @desc 명령 재시도 횟수 초과
   */
  E_RETRY_MAX: 6,
  /**
   * @type {number} Error Device Disconnected
   * @desc 장치와의 접속이 끊어짐
   */
  E_DISCONNECTED_DEVICE: 7,
  /**
   * @type {number} Error Unexptected Error
   * @desc 예상치 못한 에러
   */
  E_UNEXPECTED: 8,
  /**
   * @type {number} Error Non Cmd
   * @desc 유효한 명령 아님
   */
  E_NON_CMD: 9,
};


exports.definedCommandSetRank = {
  /**
   * @type {number} [0순위] 긴급 명령
   * @desc 긴급 명령 발생. 진행 중인 명령이 존재한다면 후순위로 밀어두고 Emergency부터 처리
   */
  EMERGENCY: 0, 
  /**
   * @type {number} [1순위] 명령
   * @desc CommandSet이 완료되고 난 후 1순위로 처리해야할 명령 집합
   */
  FIRST: 1,   
  /**
   * @type {number} [2순위] 명령
   * @desc CommandSet이 완료되고 난 후 2순위로 처리해야할 명령 집합
   */
  SECOND: 2,   
  /**
   * @type {number} [3순위] 명령
   * @desc CommandSet이 완료되고 난 후 3순위로 처리해야할 명령 집합
   */
  THIRD: 3,   
};


exports.definedCommandSetMessage = {
  /**
   * @type {number} 명령 집합의 모든 명령 수행 완료
   */
  COMMANDSET_EXECUTION_TERMINATE: 0, 
  /**
   * @type {number} 명령 집합 추가 성공
   */
  COMMANDSET_ADD_SUCCESS: 1,   
  /**
   * @type {number} 명령 집합 추가 실패
   */
  COMMANDSET_ADD_FAIL: 2,   
  /**
   * @type {number} 명령 집합 삭제 성공
   */
  COMMANDSET_DELETE_SUCCESS: 3,   
  /**
   * @type {number} 명령 집합 삭제 실패
   */
  COMMANDSET_DELETE_FAIL: 4,   
  /**
   * @type {number} 장치와 1:1 통신이 설정 되었을 경우
   * @desc 1:1 통신으로 다음 명령 집합이 있더라도 수행하지 않음
   */
  ONE_AND_ONE_COMUNICATION: 5,   

};