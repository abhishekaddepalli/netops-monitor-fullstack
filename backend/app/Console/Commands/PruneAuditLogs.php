<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PruneAuditLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logs:prune';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prune audit logs older than the globally configured retention period';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true);
        }

        $days = $settings['log_retention_days'] ?? null;

        if (!$days) {
            $this->info("Log retention is disabled or not configured. No logs deleted.");
            return;
        }

        $date = now()->subDays((int)$days);
        $count = AuditLog::where('created_at', '<', $date)->delete();

        $this->info("Deleted $count audit logs older than $days days.");
    }
}
