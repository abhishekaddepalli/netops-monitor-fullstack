module.exports = {
  apps: [
    {
      name: 'netops-queue',
      script: 'artisan',
      interpreter: 'php',
      args: 'queue:work --queue=monitor-checks-fast,monitor-checks,default --sleep=1 --tries=3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      out_file: '/dev/null',
      error_file: '/dev/null',
    },
    {
      name: 'netops-schedule',
      script: 'artisan',
      interpreter: 'php',
      args: 'schedule:work',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      out_file: '/dev/null',
      error_file: '/dev/null',
    }
  ]
};
