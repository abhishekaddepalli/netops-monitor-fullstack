const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const filesToUpload = [
      {
        local: path.join(__dirname, 'backend', 'app', 'Services', 'Alerts', 'WirePusherAlertSender.php'),
        remote: '/root/netops-monitor-fullstack/backend/app/Services/Alerts/WirePusherAlertSender.php'
      },
      {
        local: path.join(__dirname, 'backend', 'app', 'Services', 'Alerts', 'AlertSenderFactory.php'),
        remote: '/root/netops-monitor-fullstack/backend/app/Services/Alerts/AlertSenderFactory.php'
      }
    ];
    
    let uploaded = 0;
    
    filesToUpload.forEach(f => {
      console.log('Uploading ' + f.local);
      sftp.fastPut(f.local, f.remote, (err) => {
        if (err) throw err;
        console.log('Uploaded ' + f.remote);
        uploaded++;
        if (uploaded === filesToUpload.length) {
          console.log('Restarting queue worker');
          conn.exec('cd /root/netops-monitor-fullstack/backend && php artisan queue:restart', (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
              console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
              conn.end();
            }).on('data', (data) => {
              console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
              console.log('STDERR: ' + data);
            });
          });
        }
      });
    });
  });
}).connect({
  host: '103.194.228.207',
  port: 22,
  username: 'root',
  password: 'cDzhKmQNdM7UFaZj'
});
