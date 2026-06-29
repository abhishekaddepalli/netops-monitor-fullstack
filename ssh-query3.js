const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('grep -o "V43" /root/netops-monitor-fullstack/backend/public/assets/index-DFV9ENb-.js', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log('RESULT:', out);
      conn.end();
    }).on('data', (data) => {
      out += data.toString();
    });
  });
}).connect({
  host: '103.194.228.207',
  port: 22,
  username: 'root',
  password: 'cDzhKmQNdM7UFaZj'
});
