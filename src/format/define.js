
/**
 * @typedef {Object} requestCommandFormat 요청 명령 자료 구조
 * @property {number} rank 우선순위 (0: 긴급 명령으로 현재 진행되고 있는 명령 무시하고 즉시 해당 명령 수행, 1: 1순위 명령, 2: 2순위 명령 ...) 기본 값 2
 * @property {string} commandId 해당 명령 통합 ID
 * @property {number=} currCmdIndex cmdList Index => Default: 0
 * @property {Array.<commandInfo>} cmdList 명령을 보낼 배열
 */


/**
 * @typedef {Object} commandFormat 명령 수행 자료 구조
 * @property {number} rank 우선순위 (0: 긴급 명령으로 현재 진행되고 있는 명령 무시하고 즉시 해당 명령 수행, 1: 1순위 명령, 2: 2순위 명령 ...) 기본 값 2
 * @property {string} commandId 해당 명령 통합 ID
 * @property {Array.<commandInfo>} cmdList 명령을 보낼 배열
 * @property {number} currCmdIndex cmdList Index
 * @property {AbstCommander} commander [Auto Made] 명령을 요청한 Commander
 * @property {boolean} hasOneAndOne [Auto Made] 계속하여 연결을 수립할지 여부
 */

/**
 * @typedef {Object} commandInfo 실제 장치로 명령을 수행할 데이터
 * @property {*} data 실제 수행할 명령
 * @property {number=} delayMs 해당 명령을 수행하기전 대기 시간(ms)
 * @property {number} timoutMs 해당 명령을 수행할때까지의 timeout 유예시간(ms)
 */


/**
 * @typedef {Object} deviceClientFormat Device Client 생성 자료 구조
 * @property {string} target_id device ID
 * @property {string} target_category inverter, connector, weather
 * @property {string} target_protocol s_hex, dm_v2, ...
 * @property {string} hasOneAndOne 계속하여 연결을 수립할지 여부
 * @property {connectInfo} connect_info
 */

/**
 * @typedef {Object} connectInfo 장치와의 접속 정보
 * @property {bollean} hasOneAndOne 
 * @property {string} type 'socket', 'serial', 'zigbee', ...
 * @property {string=} subType 'parser', 'xbee', ....
 * @property {number=} baudRate 
 * @property {string=|number=} port 
 * @property {string=} host 접속 경로(socket 일 경우 사용)
 * @property {string=|number=} port 
 * @property {Object=} addConfigInfo 추가 접속 정보
 */



/**
 * @typedef {Object} commandStorage 장치를 제어할 명령 저장소
 * @property {commandFormat} process 현재 진행중인 명령
 * @property {Array.<{rank: number, list: Array.<commandFormat>}>} rankList Commander로부터 요청받은 명령을 담을 그릇
 * @property {Array.<commandFormat>} reservedList Delay가 존재하는 명령이 대기하는 목록
 */

