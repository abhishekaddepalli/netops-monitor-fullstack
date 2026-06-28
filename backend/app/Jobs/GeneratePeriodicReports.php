<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Models\Incident;
use App\Mail\PerformanceReportMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class GeneratePeriodicReports implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $period)
    {
        // $period is 'weekly' or 'monthly'
    }

    public function handle(): void
    {
        $startDate = $this->period === 'weekly' ? now()->subWeek() : now()->subMonth();

        // Get all organizations that have the report enabled
        $column = $this->period === 'weekly' ? 'enable_weekly_reports' : 'enable_monthly_reports';
        $orgs = Organization::where($column, true)->where('is_active', true)->get();

        foreach ($orgs as $org) {
            $metrics = $this->calculateMetrics($org, $startDate);
            if (empty($metrics['monitors'])) {
                continue; // Skip if no monitors
            }

            // Send to all org admins
            $admins = $org->users()->wherePivot('role', 'org_admin')->get();
            foreach ($admins as $admin) {
                Mail::to($admin->email)->send(new PerformanceReportMail($org, $this->period, $metrics));
            }
        }
    }

    private function calculateMetrics(Organization $org, $startDate): array
    {
        $monitors = $org->monitors()->get();
        $totalIncidents = 0;
        $totalDowntimeMinutes = 0;
        $monitorMetrics = [];

        foreach ($monitors as $monitor) {
            $incidents = Incident::where('monitor_id', $monitor->id)
                ->where('started_at', '>=', $startDate)
                ->get();
            
            $monitorIncidents = $incidents->count();
            $monitorDowntime = 0;

            foreach ($incidents as $inc) {
                $end = $inc->resolved_at ?? now();
                $monitorDowntime += $inc->started_at->diffInMinutes($end);
            }

            $totalIncidents += $monitorIncidents;
            $totalDowntimeMinutes += $monitorDowntime;

            // Calculate uptime
            $totalMinutes = $startDate->diffInMinutes(now());
            $uptimeMinutes = max(0, $totalMinutes - $monitorDowntime);
            $uptimePercent = $totalMinutes > 0 ? round(($uptimeMinutes / $totalMinutes) * 100, 2) : 100;

            $monitorMetrics[] = [
                'name' => $monitor->name,
                'uptime' => $uptimePercent,
                'incidents' => $monitorIncidents,
            ];
        }

        // Overall uptime
        $totalMinutesAll = $startDate->diffInMinutes(now()) * max(1, $monitors->count());
        $overallUptimeMinutes = max(0, $totalMinutesAll - $totalDowntimeMinutes);
        $overallUptimePercent = $totalMinutesAll > 0 ? round(($overallUptimeMinutes / $totalMinutesAll) * 100, 2) : 100;

        return [
            'total_incidents' => $totalIncidents,
            'total_downtime_minutes' => $totalDowntimeMinutes,
            'uptime_percentage' => $overallUptimePercent,
            'monitors' => $monitorMetrics,
        ];
    }
}
