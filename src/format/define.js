
/**
 * @typedef {Object} requestCommandSet 요청 명령 자료 구조
 * @property {number} rank 우선순위 (0: 긴급 명령으로 현재 진행되고 있는 명령 무시하고 즉시 해당 명령 수행, 1: 1순위 명령, 2: 2순위 명령 ...) 기본 값 2
 * @property {string} commandId 해당 명령 집합 통합 ID
 * @property {string} commandType 명령 통합의 요청, 삭제 (ADD, CANCEL)
 * @property {string} commandName 해당 명령 집합 단위 이름
 * @property {number=} currCmdIndex cmdList Index => Default: 0
 * @property {Array.<commandInfo>} cmdList 명령을 보낼 배열
 */

/**
 * @typedef {Object} commandSet 명령 수행 자료 구조
 * @property {number} rank 우선순위 (0: 긴급 명령으로 현재 진행되고 있는 명령 무시하고 즉시 해당 명령 수행, 1: 1순위 명령, 2: 2순위 명령 ...) 기본 값 2
 * @property {string} commandId 해당 명령 통합 ID
 * @property {string} commandType 명령 통합의 요청, 삭제 (ADD, CANCEL)
 * @property {string} commandName 해당 명령 집합 단위 이름
 * @property {Array.<commandInfo>} cmdList 명령을 보낼 배열
 * @property {number} currCmdIndex cmdList Index
 * @property {number} operationStatus 명령 수행 상태
 * @property {AbstCommander} commander [Auto Made] 명령을 요청한 Commander
 * @property {boolean} hasErrorHandling [Auto Made] 에러가 발생하였을 경우 다음 명령 진행을 멈출지 여부
 * @property {boolean} hasOneAndOne [Auto Made] 계속하여 연결을 수립할지 여부
 * @property {Timer=} commandExecutionTimer [Running Time Made] 명령 발송 후 응답까지 기다리는 SetTimeout
 * @property {Timer=} commandQueueReturnTimer [Running Time Made] 진행할 명령의 지연시간이 존재할 경우 standbyCommandSetList 대기열로 돌아오기까지의 SetTimeout
 */


/**
 * @typedef {Object} commandInfo 실제 장치로 명령을 수행할 데이터
 * @property {*} data 실제 수행할 명령
 * @property {number=} delayExecutionTimeoutMs 해당 명령을 수행하기전 대기 시간(ms)
 * @property {number} commandExecutionTimeoutMs 해당 명령을 수행할때까지의 timeout 유예시간(ms)
 */ 

/**
 * @typedef {Object} Timer 커스터마이징 타이머
 * @property {Function} start setTimeout(), remaining 차감 시작
 * @property {Function} pause clearTimeout(), remaining 시간 정지
 * @property {Function} getTimeLeft 요청 명령 실행까지의 남은 시간 반환
 * @property {Function} getStateRunning Timer의 동작 유무 확인, true: Running, false: Pause
 */






/**
 * @typedef {Object} deviceClientConstructionInfo Device Client 생성 자료 구조
 * @property {string} target_id device ID
 * @property {string} target_category inverter, connector, weather
 * @property {string} target_protocol s_hex, dm_v2, ...
 * @property {string} hasOneAndOne 계속하여 연결을 수립할지 여부
 * @property {logOption} logOption 일어나는 이벤트에 대해 FileSystem 처리할 항목
 * @property {connectInfo} connect_info
 */

/**
 * @typedef {Object} logOption 일어나는 이벤트에 대해 FileSystem 처리할 항목
 * @property {boolean} hasDcEvent Connect, Disconnect
 * @property {boolean} hasDcError Timeout, Incorrect, Unhandling, ...
 * @property {boolean} hasDcMessage ExecutionTerminate, OneAndOne, Delete Success
 * @property {boolean} hasTransferCommand 요청 Data 
 * @property {boolean} hasCommanderResponse 데이터에 대한 Commander의 요청
 * @property {boolean} hasReceiveData 수신 Data 
 */
 


/**
 * @typedef {Object} connectInfo 장치와의 접속 정보
 * @property {bollean} hasOneAndOne 
 * @property {string} type 'socket', 'serial', 'zigbee', ...
 * @property {string=} subType 'parser', 'xbee', ....
 * @property {number=} baudRate 
 * @property {string=|number=} port 
 * @property {string=} host 접속 경로(socket 일 경우 사용)
 * @property {Object=} addConfigInfo type, subType의 Contoller에서 요구하는 추가 접속 정보
 */

/**
 * @typedef {Object} commandStorage 장치를 제어할 명령 저장소
 * @property {commandSet} currentCommandSet 현재 진행중인 명령
 * @property {Array.<{rank: number, list: Array.<commandSet>}>} standbyCommandSetList Commander로부터 요청받은 명령을 담을 그릇
 * @property {Array.<commandSet>} delayCommandSetList Delay가 존재하는 명령이 대기하는 목록
 */


/**
 * @typedef {Object} dcEvent 장치에서 Event가 발생하여 연결 중인 모든 Commander에게 알려줘야 할 때 사용
 * @property {string} eventName 발생 이벤트 명
 * @property {Error=} eventMsg 발생 이벤트 내용
 * @property {Object=} spreader 이벤트 전파자
 */ 

/**
 * @typedef {Object} dcError CommandSet의 각각의 명령을 수행하는 도중 문제가 생길경우 해당 Commander에게 알려줘야할 때 사용
 * @property {commandSet} commandSet 수행 명령 집합
 * @property {Error} errorInfo 발생 이벤트 내용
 * @property {Manager} spreader 이벤트 전파자
 */  

/**
 * @typedef {Object} dcData CommandSet의 각각의 명령을 수행 결과 응답 데이터를 해당 Commander에게 알려줘야할 때 사용
 * @property {commandSet} commandSet 수행 명령 집합
 * @property {Buffer|*} data 발생한 데이터
 * @property {Manager} spreader 이벤트 전파자
 */ 

/**
 * @typedef {Object} dcMessage CommandSet을 수행하는 과정에서 생겨난 메시지
 * @property {commandSet} commandSet 수행 명령 집합
 * @property {number} msgCode 발생 메시지 Code
 * @property {Manager} spreader 메시지 전파자
 */ 
 


/**
 * @typedef {Object} deviceControllerStauts 장치 컨트롤러의 상태 정보
 * @property {boolean} hasConnect 장치와의 접속 성공 여부
 * @property {boolean} hasError 장치에서 에러가 발생하였는지 여부
 * @property {Timer=} connectTimer 장치와의 접속 수립을 위한 타이머
 */ 
  