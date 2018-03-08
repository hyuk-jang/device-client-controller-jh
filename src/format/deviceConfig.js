/**
 * @typedef {Object} deviceConfigSerial Serial Config
 * @property {string} port 접속 Port
 * @property {number} baud_rate 보 레이트
 */

/**
 * @typedef {Object} deviceConfigSerialWithParser Parser를 붙인 Serial config
 * @property {string} port 접속 Port
 * @property {number} baud_rate 보 레이트
 * @property {Object} parser SerialPort에 Binding 할 Parser 객체
 * @property {type} parser.type 'delimiterParser', 'byteLengthParser', 'readLineParser', 'readyParser'
 * @property {*} parser.option 각 Parser Type에 맞는 Option
 * @example
 * parser{type:'delimiterParser', option: Buffer.from([0x04])}  해당 option과 매칭까지의 데이터 반환
 * parser{type:'byteLengthParser', option: 55} 55Byte로 끊어서 반환
 * parser{type:'readLineParser', option: '\r\n'} Carrige Return 과 Line Feed를 만족할 경우 해당 Option을 제외하고 반환
 * parser{type:'readyParser', option: 'Ready'} all data after READY is received
 */

/**
 * @typedef {Object} deviceConfigSocket Socket Config
 * @property {number} port 접속 Port
 * @property {string} host 접속 host
 */

