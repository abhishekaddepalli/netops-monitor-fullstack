const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Testing Mikrotik Health...');
  conn.exec('snmpwalk -v 2c -c kits -O Qn 117.240.120.220 1.3.6.1.4.1.14988.1.1.3', (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', () => {
      conn.end();
    });
  });
}).connect({
  host: '103.194.228.207',
  port: 22,
  username: 'root',
  password: 'cDzhKmQNdM7UFaZj'
});
