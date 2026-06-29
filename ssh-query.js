const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('php /root/netops-monitor-fullstack/backend/artisan tinker --execute="echo json_encode(App\\\\Models\\\\Monitor::find(21)->toArray());"', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '103.194.228.207',
  port: 22,
  username: 'root',
  password: 'cDzhKmQNdM7UFaZj'
});
