const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('tail -n 100 /root/netops-monitor-fullstack/backend/storage/logs/laravel.log', (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('data', (d) => {
      data += d.toString();
    });
    stream.stderr.on('data', (d) => {
      console.error(d.toString());
    });
    stream.on('close', () => {
      console.log(data);
      conn.end();
    });
  });
}).connect({
  host: '103.194.228.207',
  port: 22,
  username: 'root',
  password: 'cDzhKmQNdM7UFaZj'
});
