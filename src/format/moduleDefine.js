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
  REQUEST: 1,
  /**
   * @type {number} Response Success
   * @desc 명령 요청 처리 성공
   */
  RESPONE_SUCCESS: 2,
  /**
   * @type {number} Request Delete Current Command Set
   * @desc 현재 명령 셋 삭제 요청 상태
   */
  REQUEST_DELETE: 3,
  /**
   * @type {number} Error Timeout
   * @desc 에러: 타임 아웃
   */
  E_TIMEOUT: 4,
  /**
   * @type {number} Error Retry Count Full
   * @desc 명령 재시도 횟수 초과
   */
  E_RETRY_MAX: 5,
  /**
   * @type {number} Error Non Cmd
   * @desc 유효한 명령 아님
   */
  E_NON_CMD: 6,
};