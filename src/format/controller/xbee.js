
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

/**
 * @typedef {Object} xbeeApi_0x10 0x10(d 16): ZigBee Transmit Request (ZNet, ZigBee)
 * @property {number} type // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
 * @property {number} id  // optional, nextFrameId() is called per default 
 * @property {string} destination64: "0013a200400a0127",
 * @property {string=} destination16: "fffe", // optional, "fffe" is default
 * @property {number=} broadcastRadius: 0x00, // optional, 0x00 is default
 * @property {number=} options: 0x00, // optional, 0x00 is default
 * @property {string|Buffer} data: "TxData0A" // Can either be string or byte array.
 */

/**
 * ND Discorvery
 * @typedef {Object} xbeeApi_0x88 (d 136): AT Command Response (802.15.4, ZNet, ZigBee)
 * @property {number} type: 0x88, // xbee_api.constants.FRAME_TYPE.AT_COMMAND_RESPONSE 
 * @property {number} id: 0x01,
 * @property {number} command: "BD",
 * @property {number} commandStatus: 0x00,
 * @property {number} commandData: []
 */


/**
 * Transmit Status
 * @typedef {Object} xbeeApi_0x8B 0x8B(d 139): ZigBee Transmit Status (ZNet, ZigBee)
 * @property {number} type xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_STATUS 
 * @property {number} id 0x01,
 * @property {string} remote16: "7d84",
 * @property {number} transmitRetryCount: 0,
 * @property {number} deliveryStatus: 0,
 * @property {number} discoveryStatus: 1
 */


/**
 * Receive Packet
 * @typedef {Object} xbeeApi_0x90 0x90(d 144): ZigBee Receive Packet (AO=0) (ZNet, ZigBee)
 * @property {number} type xbee_api.constants.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET
 * @property {number} remote64: "0013a20040522baa",
 * @property {number} remote16: "7d84",
 * @property {number} receiveOptions: 0x01,
 * @property {number} data: [ 0x52, 0x78, 0x44, 0x61, 0x74, 0x61 ]
 */ 