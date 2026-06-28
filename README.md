# NetOps Monitor — Enterprise Full Stack

NetOps Monitor is a comprehensive, multi-tenant network monitoring, alerting, and diagnostic platform. Built for ISPs and Enterprises, it combines robust automated monitoring with a suite of diagnostic tools, integrated billing, and radius management.

## Key Features
- **Advanced Monitoring Engine**: Ping, HTTP, Keyword, Port, DNS, SSL, and SNMP monitors.
- **Diagnostic Tools**: Real-time tools for Ping, Traceroute, Port Scanning, DNS Lookup, WHOIS, IP Reputation, and Network Discovery.
- **Multi-Tenant Architecture**: Complete RBAC with Super Admin and Organization roles.
- **Integrated Billing & Plans**: Recurring subscriptions with Razorpay and manual UPI/QR flows.
- **Multi-Channel Alerting**: Email, Slack, Discord, Telegram, Webhooks, WhatsApp, MS Teams, and SMS.
- **Public Status Pages**: Customizable incident and uptime dashboards.
- **Radius Integration**: External subscriber management and ISP features.

---

## Server Requirements

To run NetOps Monitor in a production environment, you will need a Linux VPS (Ubuntu 22.04 / 24.04 recommended) with the following specifications:

- **CPU**: 2+ Cores
- **RAM**: 4GB+ (8GB recommended for heavy SNMP/Discovery loads)
- **Disk**: 40GB+ SSD
- **OS**: Ubuntu / Debian

### Required Software
- **Web Server**: Nginx or Apache
- **PHP**: 8.2 or 8.3 with extensions (`bcmath`, `ctype`, `fileinfo`, `json`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`, `curl`, `zip`, `sqlite3` or `mysql`)
- **Node.js**: v18 or v20+ (for building the frontend)
- **Database**: SQLite (default) or MySQL/MariaDB
- **Process Manager**: PM2 (for running Laravel queues and schedulers)
- **Composer**: PHP package manager

---

## Production Installation Process

Follow these steps to deploy NetOps Monitor on a fresh Ubuntu server.

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.2 and extensions
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-sqlite3 php8.2-curl php8.2-mbstring php8.2-xml php8.2-zip unzip curl git nginx

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js (v20) and NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager) globally
sudo npm install -g pm2
```

### 2. Clone and Setup Backend
```bash
# Clone the repository
git clone https://github.com/abhishekaddepalli/netops-monitor-fullstack.git /var/www/netops
cd /var/www/netops/backend

# Install PHP Dependencies
composer install --optimize-autoloader --no-dev

# Setup Environment
cp .env.example .env
php artisan key:generate

# Configure the database (SQLite is default)
touch database/database.sqlite
php artisan migrate --force
php artisan db:seed --force
```

### 3. Build the Frontend
```bash
cd /var/www/netops/frontend

# Install Node Dependencies
npm install

# Build for production
npm run build

# Copy build files to Laravel's public directory
cp -R dist/* ../backend/public/
```

### 4. Setup PM2 for Queue and Scheduler
To ensure background tasks (like checking monitors and sending alerts) run reliably, we use PM2.

```bash
cd /var/www/netops/backend

# Start the Ecosystem processes (Queue Worker & Schedule Runner)
pm2 start ecosystem.config.cjs

# Save PM2 state to restart on server reboot
pm2 save
pm2 startup
```

### 5. Configure Nginx
Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/netops
```

Paste the following configuration (replace `yourdomain.com`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/netops/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php index.html;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/netops /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Storage Permissions
Ensure the web server has permission to write to the storage directory:
```bash
cd /var/www/netops/backend
sudo chown -R www-data:www-data storage bootstrap/cache database
sudo chmod -R 775 storage bootstrap/cache database
```

---

## System Architecture Updates

Unlike the initial stubbed version, this codebase has been completely connected and battle-tested for production:
- **Unified Deployment**: The React frontend is compiled directly into the Laravel public directory.
- **SSH / Remote Executions**: Tools like Network Discovery and Traceroute utilize server-side shell commands directly. 
- **Billing Integrity**: Integrated Razorpay verification alongside an Admin-approved UPI/QR manual flow for maximum flexibility.
- **Diagnostic Sandbox**: Powerful troubleshooting tools are unlocked conditionally based on Organization billing plans.

Enjoy your powerful new NetOps Monitor!
