const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const assetsDir = path.join(__dirname, 'frontend', 'dist', 'assets');
    const files = fs.readdirSync(assetsDir);
    
    let uploaded = 0;
    files.forEach(file => {
      const localPath = path.join(assetsDir, file);
      const remotePath = '/root/netops-monitor-fullstack/backend/public/assets/' + file;
      
      console.log('Uploading', file);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) throw err;
        console.log('Uploaded', file);
        uploaded++;
        if (uploaded === files.length) {
          // Now update index.html
          sftp.fastPut(
            path.join(__dirname, 'frontend', 'dist', 'index.html'),
            '/root/netops-monitor-fullstack/backend/public/index.html',
            (err) => {
              if (err) throw err;
              console.log('Uploaded index.html');
              // Clear old assets (except the ones we just uploaded)
              // Actually, since the new index.html points to the new ones, it's fine.
              conn.end();
            }
          );
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
