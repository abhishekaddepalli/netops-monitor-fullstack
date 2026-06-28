<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DiscoveryJob;
use App\Services\DiscoveryJobService;
use Carbon\Carbon;

class RunDiscoveryJobs extends Command
{
    protected $signature = 'discovery:run';
    protected $description = 'Run continuous network discovery jobs';

    public function handle(DiscoveryJobService $service)
    {
        $jobs = DiscoveryJob::where('is_active', true)->get();
        
        foreach ($jobs as $job) {
            $shouldRun = false;
            
            if (is_null($job->last_run_at)) {
                $shouldRun = true;
            } else {
                $diff = Carbon::now()->diffInMinutes($job->last_run_at);
                if ($diff >= $job->interval_minutes) {
                    $shouldRun = true;
                }
            }
            
            if ($shouldRun) {
                $this->info("Running discovery job {$job->id}");
                try {
                    $service->runJob($job);
                } catch (\Exception $e) {
                    $this->error("Error running job {$job->id}: " . $e->getMessage());
                }
            }
        }
        
        return 0;
    }
}
