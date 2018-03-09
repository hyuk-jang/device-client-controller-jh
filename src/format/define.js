

/**
 * @typedef {Object} commandFormat 명령 자료 구조
 * @property {number} rank 우선순위 (0: 현재 진행되고 있는 명령 무시하고 즉시 해당 명령 수행, 1: 1순위 명령, 2: 2순위 명령 ...)
 * @property {string} name 별칭
 * @property {string} uuid uuid
 * @property {boolean} hasOneAndOne 계속하여 연결을 수립할지 여부
 * @property {AbstCommander} commander 명령을 요청한 Commander
 * @property {Array} cmdList 명령을 보낼 배열
 * @property {number} currCmdIndex cmdList Index
 * @property {number} timeoutMs 명령을 보내고 응답 시간안에 성공을 받지 못할때까지의 대기시간(ms)
 */


/**
 * @typedef {Object} deviceClientFormat Device Client 생성 자료 구조
 * @property {Object=} observer Device Client 주체. (최종적으로 데이터를 수신할 대상)
 * @property {string} target_id device ID
 * @property {string} connect_type 'socket', 'serial', ...
 * @property {number|string} port socket --> number, serial --> string, ...
 * @property {string} host 접속 경로(socket 일 경우 사용)
 * @property {number} baud_rate serial 일 경우 
 * @property {{type: string, option: *}=} parser serial 일 경우 pipe 처리할 parser option
 */

// * @property {string} target_category inverter, connector
// * @property {string} target_protocol s_hex, dm_v2, ...
// * @property {} protocol 프로토콜 변환기 ID
/**
 * @typedef {Object} commandStorage 장치를 제어할 명령 저장소
 * @property {commandFormat} process 현재 진행중인 명령
 * @property {Array.<{rank: number, list: Array.<commandFormat>}>} rankList Commander로부터 요청받은 명령을 담을 그릇
 */

