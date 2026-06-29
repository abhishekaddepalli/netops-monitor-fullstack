const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const toUpload = [
      'backend/routes/api.php',
      'backend/app/Http/Controllers/Api/Admin/OrganizationController.php',
      'backend/app/Models/Organization.php',
      'backend/app/Services/Monitors/SnmpChecker.php',
      'backend/app/Http/Controllers/Api/DiagnosticToolController.php'
    ];
    let uploaded = 0;
    toUpload.forEach(file => {
      sftp.fastPut(file, `/root/netops-monitor-fullstack/${file}`, (err) => {
        if (err) throw err;
        console.log(`Uploaded ${file}`);
        uploaded++;
        if (uploaded === toUpload.length) {
          conn.exec('cd /root/netops-monitor-fullstack/backend && php artisan migrate --force && php artisan queue:restart', (err, stream) => {
            if (err) throw err;
            stream.on('data', (d) => process.stdout.write(d.toString()));
            stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
            stream.on('close', () => {
              console.log('Migrated and Queue restarted');
              conn.end();
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
