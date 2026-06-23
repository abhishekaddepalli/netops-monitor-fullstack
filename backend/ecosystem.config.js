module.exports = {
  apps: [
    {
      name: 'netops-queue-worker',
      script: 'artisan',
      interpreter: 'php',
      args: 'queue:work --queue=monitor-checks-fast,monitor-checks,default --sleep=1 --tries=3 --timeout=120',
      instances: 1, // You can increase this to 2 or 3 if you have thousands of monitors
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        APP_ENV: 'production',
      }
    },
    {
      name: 'netops-scheduler',
      script: 'artisan',
      interpreter: 'php',
      args: 'schedule:work',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        APP_ENV: 'production',
      }
    }
  ]
};
