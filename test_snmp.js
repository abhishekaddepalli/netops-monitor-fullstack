const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const localFile = 'test_mtik.php';
    sftp.fastPut(localFile, '/root/netops-monitor-fullstack/test_mtik.php', (err) => {
      if (err) throw err;
      conn.exec('cd /root/netops-monitor-fullstack && php test_mtik.php', (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data.toString()));
        stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
        stream.on('close', () => conn.end());
      });
    });
  });
}).connect({
  host: '103.194.228.207',
  port: 22,
  username: 'root',
  password: 'cDzhKmQNdM7UFaZj'
});
