<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Services\MailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GeneratePeriodicReports implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $period = 'monthly')
    {
        // $period is 'weekly' or 'monthly'
    }

    public function handle(): void
    {
        // Get all organizations that have the report enabled (or all active if flag not set)
        $column = $this->period === 'weekly' ? 'enable_weekly_reports' : 'enable_monthly_reports';
        
        $orgs = Organization::where('is_active', true)
            ->where(function ($q) use ($column) {
                $q->where($column, true)->orWhereNull($column);
            })
            ->get();

        Log::info("Generating {$this->period} performance reports for {$orgs->count()} organizations.");

        foreach ($orgs as $org) {
            try {
                MailService::sendPeriodicReport($org, $this->period);
            } catch (\Throwable $e) {
                Log::warning("Failed to generate {$this->period} report for org '{$org->name}': " . $e->getMessage());
            }
        }
    }
}
