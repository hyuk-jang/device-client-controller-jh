exports.definedOperationStatus = {
  /**
   * @type {string} Wait(Default)
   * @desc 명령 대기 상태
   */
  WAIT: 'WAIT',
  /**
   * @type {string} Request Command
   * @desc 명령 요청 상태 (진행 중)
   */
  REQUEST_CMD: 'REQUEST_CMD',
  /**
   * @type {string} REQUEST_CMD가 성공적으로 실행될 경우 상태 변경
   * @desc 데이터 수신 기다림
   */
  RECEIVE_WAIT_DATA: 'RECEIVE_WAIT_DATA',
  /**
   * @type {string} 데이터 수신이 이루어지고 해당 데이터에 대한 Commander의 응답을 기다리는 중
   * @desc 데이터 수신 기다림
   */
  RECEIVE_WAIT_PROCESSING_DATA: 'RECEIVE_WAIT_PROCESSING_DATA',
  /**
   * @type {string} Commander로부터 더 많은 데이터를 원하는 경우(Timeout 시간까지 기다림)
   * @desc 데이터 수신 기다림
   */
  RECEIVE_WAIT_MORE_DATA: 'RECEIVE_WAIT_MORE_DATA',
  /**
   * @type {string} Commander로부터 데이터가 오류라는 지시를 얻은 경우
   * @desc 데이터 수신 기다림
   */
  RECEIVE_DATA_ERROR: 'RECEIVE_DATA_ERROR',
  /**
   * @type {string} Commander로부터 데이터의 승인을 얻은 경우
   * @desc 명령 요청 처리 성공
   */
  RECEIVE_DATA_DONE: 'RECEIVE_DATA_DONE',
  /**
   * @type {string} Commander로부터 강제로 다음단계로 가라고 명령 받음
   * @desc 다음 단계로 나아감
   */
  RECEIVE_NEXT_FORCE: 'RECEIVE_NEXT_FORCE',  
  /**
   * @type {string} 지연 명령 처리 상태
   * @desc 명령 요청 상태 (진행 중)
   */
  PROCESSING_DELEAY_COMMAND: 'PROCESSING_DELEAY_COMMAND',
  /**
   * @type {string} Request Delete Current Command Set
   * @desc 현재 명령 셋 삭제 요청 상태
   */
  PROCESSING_DELETE_COMMAND: 'PROCESSING_DELETE_COMMAND',
  /**
   * @type {string} Error Device Disconnected
   * @desc 장치와의 접속이 끊어짐
   */
  E_DISCONNECTED_DEVICE: 'E_DISCONNECTED_DEVICE',
  /**
   * @type {string} Error Timeout
   * @desc RECEIVE_WAIT_DATA, RECEIVE_WAIT_MORE_DATA
   */
  E_TIMEOUT: 'E_TIMEOUT',
  /**
   * @type {string} 데이터가 수신 되었으나 일부분만 수신된 경우
   * @desc 
   */
  E_DATA_PART: 'E_DATA_PART',
  /**
   * @type {string} 데이터가 수신 되었으나 Commander가 아무런 조치를 하지 않은 경우
   * @desc RECEIVE_WAIT_PROCESSING_DATA --> 데이터 미조치 에러
   */
  E_UNHANDLING_DATA: 'E_UNHANDLING_DATA',
  /**
   * @type {string} 데이터의 오류
   * @desc RECEIVE_DATA_ERROR 
   */
  E_INCORRECT_DATA: 'E_INCORRECT_DATA',
  /**
   * @type {string} Error Retry Count Full
   * @desc 명령 재시도 횟수 초과
   */
  E_RETRY_MAX: 'E_RETRY_MAX',
  /**
   * @type {string} Error Unexptected Error
   * @desc 예상치 못한 에러
   */
  E_UNEXPECTED: 'E_UNEXPECTED',
  /**
   * @type {string} Error Non Cmd
   * @desc 유효한 명령 아님
   */
  E_NON_CMD: 'E_NON_CMD',
};


exports.definedOperationError = {
  /**
   * @type {string} Error Timeout
   * @desc RECEIVE_WAIT_DATA, RECEIVE_WAIT_MORE_DATA
   */
  E_TIMEOUT: {
    code: 'TIMEOUT',
    msg: '장치 응답 없음'
  },
  /**
   * @type {string} 데이터가 수신 되었으나 Commander가 아무런 조치를 하지 않은 경우
   * @desc RECEIVE_WAIT_PROCESSING_DATA --> 데이터 미조치 에러
   */
  E_UNHANDLING_DATA: {
    code: 'UNHANDLING_DATA',
    msg: '수신 데이터 미처리'
  },
  /**
   * @type {string} 데이터의 오류
   * @desc RECEIVE_DATA_ERROR 
   */
  E_INCORRECT_DATA: {
    code: 'INCORRECT_DATA',
    msg: '데이터 이상'
  },
  /**
   * @type {string} Error Retry Count Full
   * @desc 명령 재시도 횟수 초과
   */
  E_RETRY_MAX: {
    code: 'RETRY_MAX',
    msg: '재시도 횟수 초과'
  },
  /**
   * @type {string} Error Unexptected Error
   * @desc 예상치 못한 에러
   */
  E_UNEXPECTED: {
    code: 'UNEXPECTED',
    msg: '예상치 못한 에러'
  },
  /**
   * @type {string} Error Non Cmd
   * @desc 유효한 명령 아님
   */
  E_NON_CMD: {
    code: '',
    msg: ''
  },
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
   * @type {string} 명령 집합 요청 시작
   */
  COMMANDSET_EXECUTION_START: 'COMMANDSET_EXECUTION_START', 
  /**
   * @type {string} 명령 집합의 모든 명령 수행 완료
   */
  COMMANDSET_EXECUTION_TERMINATE: 'COMMANDSET_EXECUTION_TERMINATE', 
  /**
   * @type {string} 명령 집합 삭제 성공
   */
  COMMANDSET_DELETE: 'COMMANDSET_DELETE',   
  /**
   * @type {string} 명령 집합 지연 집합으로 이동
   */
  COMMANDSET_MOVE_DELAYSET: 'COMMANDSET_MOVE_DELAYSET',   
  /**
   * @type {string} 장치와 1:1 통신이 설정 되었을 경우
   * @desc 1:1 통신으로 다음 명령 집합이 있더라도 수행하지 않음
   */
  ONE_AND_ONE_COMUNICATION: 'ONE_AND_ONE_COMUNICATION',   
};


exports.definedControlEvent = {
  /**
   * @type {string} 장치에서 데이터 발생
   */
  DATA: 'dcData', 
  /**
   * @type {string} 장치와의 연결 성공
   */
  CONNECT: 'dcConnect', 
  /**
   * @type {string} 장치와의 연결 해제
   */
  DISCONNECT: 'dcDisconnect',   
  /**
   * @type {number} 장치에서 에러 발생
   */
  DEVICE_ERROR: 'dcDeviceError',   
};



exports.definedCommanderResponse = {
  /**
   * @type {string} 수신된 데이터 참
   */
  DONE: 'DONE', 
  /**
   * @type {string} 더 많은 데이터가 필요하니 기달려라
   */
  WAIT: 'WAIT', 
  /**
   * @type {string} 데이터에 문제가 있다
   */
  ERROR: 'ERROR',   
  /**
   * @type {string} 명령을 재전송 해달라
   */
  RETRY: 'RETRY',   
  /**
   * @type {string} 다음 명령으로 가라.(강제)
   */
  NEXT: 'NEXT',     
};