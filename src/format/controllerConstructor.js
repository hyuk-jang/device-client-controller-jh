/**
 * @typedef {Object} constructorSerial Serial Config
 * @property {string} port 접속 Port
 * @property {number} baudRate 보 레이트
 */

/**
 * @typedef {Object} constructorSerialWithParser Parser를 붙인 Serial config
 * @property {string} port 접속 Port
 * @property {number} baudRate 보 레이트
 * @property {{parser: string, option:*}} addConfigInfo SerialPort에 Binding 할 Parser 객체
 * #parser ---> 'delimiterParser', 'byteLengthParser', 'readLineParser', 'readyParser'
 * #option --> 각 Parser Type에 맞는 Option
 * @example
 * addConfigInfo{parser:'delimiterParser', option: Buffer.from([0x04])}  해당 option과 매칭까지의 데이터 반환
 * addConfigInfo{parser:'byteLengthParser', option: 55} 55Byte로 끊어서 반환
 * addConfigInfo{parser:'readLineParser', option: '\r\n'} Carrige Return 과 Line Feed를 만족할 경우 해당 Option을 제외하고 반환
 * addConfigInfo{parser:'readyParser', option: 'Ready'} all data after READY is received
 */

/**
 * @typedef {Object} constructorSocket Socket Config
 * @property {number} port 접속 Port
 * @property {string} host 접속 host
 */


/**
 * @typedef {Object} constructorXbee Serial Config
 * @property {string} port 접속 PortxbeeConstrucorInfo
 * @property {number} baudRate 보 레이트
 * @property {xbeeConstrucorInfo} addConfigInfo SerialPort에 Binding 할 Parser 객체
 */ 

/**
 * @typedef {Object} xbeeConstrucorInfo
 * @property {number} api_mode: 1,              // [1, 2]; 1 is default, 2 is with escaping (set ATAP=2)
 * @property {number} module: "Any",            // ["802.15.4", "ZNet", "ZigBee", "Any"]; This does nothing, yet!
 * @property {number} raw_frames: false,        // [true, false]; If set to true, only raw byte frames are
                                                //   emitted (after validation) but not parsed to objects. 
 * @property {number} convert_adc: true,        // [true, false]; If false, do not convert adc value to millivolt.
 * @property {number} vref_adc: 1200,           // (int); Set the value to convert adc value to millivolt.
 * @property {number} parser_buffer_size: 512,  // (int); size of the package parser buffer. 512 co
                                                //   when receiving A LOT of packets, you might want to decrease 
                                                //   this to a smaller value (but typically not less than 128)
 * @property {number} builder_buffer_size: 512  // (int); size of the package builder buffer. 
                                                //   when sending A LOT of packets, you might want to decrease
                                                //   this to a smaller value (but typically not less than 128)
 */
