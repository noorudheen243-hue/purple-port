
const ZKLib = require('zkteco-js');
async function main() {
  const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000);
  await zk.createSocket();
  await zk.connect();
  const time = await zk.getTime();
  console.log('getTime:', time, typeof time, time instanceof Date);
  const attendances = await zk.getAttendances();
  console.log('Sample attendance:', attendances.data[attendances.data.length - 1]);
  await zk.disconnect();
}
main().catch(console.error);

