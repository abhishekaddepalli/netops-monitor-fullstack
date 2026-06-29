const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('php /root/netops-monitor-fullstack/backend/artisan tinker --execute="echo json_encode(App\\\\Models\\\\ServerMetric::where(\'monitor_id\', 21)->latest()->limit(2)->get()->toArray(), JSON_PRETTY_PRINT);"', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('close', (code, signal) => {
      console.log('METRICS:', out);
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
