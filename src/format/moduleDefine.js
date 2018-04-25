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
   * @type {number} Error Non Cmd
   * @desc 유효한 명령 아님
   */
  E_NON_CMD: 7,
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