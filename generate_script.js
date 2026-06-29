const fs = require('fs');
const files = [
  'backend/database/migrations/2026_06_24_140000_add_billing_cycle_to_organizations_table.php',
  'backend/app/Models/Organization.php',
  'backend/app/Http/Controllers/Api/BillingController.php',
  'backend/app/Http/Controllers/Api/Admin/SettingsController.php',
  'backend/app/Http/Controllers/Api/Admin/InvoiceController.php',
  'backend/routes/api.php',
  'frontend/src/pages/AdminSettings.jsx',
  'frontend/src/pages/Settings.jsx',
  'frontend/src/pages/Billing.jsx',
  'frontend/src/pages/AdminPlans.jsx',
  'frontend/src/pages/AdminInvoices.jsx',
  'frontend/src/pages/InvoicePrint.jsx',
  'frontend/src/App.jsx'
];

let script = 'cd /root/netops-monitor-fullstack\n\n';

for(const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const b64 = Buffer.from(content).toString('base64');
  script += 'mkdir -p ' + file.split('/').slice(0,-1).join('/') + '\n';
  // wrap base64 in 76 chars
  const chunks = b64.match(/.{1,76}/g) || [];
  script += `cat << 'EOF' | base64 -di > ${file}\n${chunks.join('\\n')}\nEOF\n\n`;
}

script += 'cd backend && php artisan migrate --force && cd ..\n';
script += 'cd frontend && npm run build && cd ..\n';
script += 'echo "Successfully applied update!"\n';

fs.writeFileSync('update_script.sh', script);
