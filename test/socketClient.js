const net = require('net');

const connectInfo = { host: 'fp.smsoft.co.kr', port: 8001 };

const client = net.connect(
  connectInfo,
  () => {
    console.log(`connected ${connectInfo.host} ${connectInfo.port} `);
  },
);

client.on('data', console.log)

client.write('hi');
