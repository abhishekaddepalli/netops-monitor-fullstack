module.exports = {
  apps: [
    {
      name: 'netops-queue',
      script: 'artisan',
      interpreter: 'php',
      args: 'queue:work --queue=default,alerts --sleep=3 --tries=3 --timeout=90',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '128M'
    },
    {
      name: 'netops-reverb',
      script: 'artisan',
      interpreter: 'php',
      args: 'reverb:start --host=0.0.0.0 --port=6001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M'
    },
    {
      name: 'netops-schedule',
      script: 'artisan',
      interpreter: 'php',
      args: 'schedule:work',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '128M'
    }
  ]
};
