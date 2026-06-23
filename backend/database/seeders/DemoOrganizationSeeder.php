<?php

namespace Database\Seeders;

use App\Models\AlertChannel;
use App\Models\CheckRollupHourly;
use App\Models\EscalationPolicy;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\StatusPage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $plan = Plan::where('key', 'professional')->first();

        $org = Organization::updateOrCreate(['slug' => 'bharatpay-demo'], [
            'name' => 'BharatPay Pvt Ltd',
            'billing_email' => 'billing@bharatpay.in',
            'plan' => 'professional',
            'monitor_limit' => $plan->monitor_limit,
            'team_member_limit' => $plan->team_member_limit,
            'timezone' => 'Asia/Kolkata',
            'is_active' => true,
        ]);

        $admin = User::updateOrCreate(['email' => 'ravi@bharatpay.in'], [
            'organization_id' => $org->id,
            'name' => 'Ravi Kumar',
            'password' => Hash::make('Demo@2026'),
            'system_role' => 'standard',
            'email_verified_at' => now(),
        ]);
        $org->users()->syncWithoutDetaching([$admin->id => ['role' => 'org_admin', 'joined_at' => now()]]);

        $operator = User::updateOrCreate(['email' => 'priya@bharatpay.in'], [
            'organization_id' => $org->id,
            'name' => 'Priya Sharma',
            'password' => Hash::make('Demo@2026'),
            'system_role' => 'standard',
            'email_verified_at' => now(),
        ]);
        $org->users()->syncWithoutDetaching([$operator->id => ['role' => 'operator', 'joined_at' => now()]]);

        $emailChannel = AlertChannel::updateOrCreate(
            ['organization_id' => $org->id, 'name' => 'Ops Team Email'],
            ['type' => 'email', 'config' => ['to' => ['ravi@bharatpay.in', 'priya@bharatpay.in']], 'is_active' => true]
        );

        $policy = EscalationPolicy::updateOrCreate(
            ['organization_id' => $org->id, 'name' => 'Default Policy'],
            ['is_default' => true]
        );
        $policy->steps()->delete();
        $policy->steps()->create(['level' => 1, 'delay_minutes' => 0, 'alert_channel_id' => $emailChannel->id]);
        $policy->steps()->create(['level' => 2, 'delay_minutes' => 15, 'alert_channel_id' => $emailChannel->id]);

        $monitors = [
            ['name' => 'bharatpay.in', 'type' => 'http', 'target' => 'https://bharatpay.in', 'status' => 'up', 'interval' => 60],
            ['name' => 'api.bharatpay.in', 'type' => 'http', 'target' => 'https://api.bharatpay.in/health', 'status' => 'down', 'interval' => 30,
                'config' => ['expected_status' => [200], 'keyword' => 'ok']],
            ['name' => 'shopvilla.in', 'type' => 'http', 'target' => 'https://shopvilla.in', 'status' => 'up', 'interval' => 60],
            ['name' => 'cdn.shopvilla.in', 'type' => 'http', 'target' => 'https://cdn.shopvilla.in', 'status' => 'degraded', 'interval' => 60],
            ['name' => 'db-primary', 'type' => 'tcp_port', 'target' => '10.4.0.5', 'port' => 5432, 'status' => 'up', 'interval' => 30,
                'config' => ['service' => 'postgresql']],
            ['name' => 'mail.bharatpay.in SMTP', 'type' => 'tcp_port', 'target' => '10.4.0.9', 'port' => 587, 'status' => 'up', 'interval' => 300,
                'config' => ['service' => 'smtp']],
            ['name' => 'router-mumbai-core', 'type' => 'ping', 'target' => '203.0.113.10', 'status' => 'up', 'interval' => 30],
            ['name' => 'backup-node-3', 'type' => 'ping', 'target' => '10.4.0.18', 'status' => 'up', 'interval' => 60],
            ['name' => 'bharatpay.in SSL', 'type' => 'ssl', 'target' => 'bharatpay.in', 'status' => 'up', 'interval' => 900],
            ['name' => 'shopvilla.in SSL', 'type' => 'ssl', 'target' => 'shopvilla.in', 'status' => 'degraded', 'interval' => 900],
            ['name' => 'cron-billing-job', 'type' => 'heartbeat', 'target' => 'heartbeat', 'status' => 'up', 'interval' => 900],
        ];

        $created = [];
        foreach ($monitors as $m) {
            $monitor = Monitor::updateOrCreate(
                ['organization_id' => $org->id, 'name' => $m['name']],
                [
                    'team_id' => null,
                    'created_by' => $admin->id,
                    'escalation_policy_id' => $policy->id,
                    'type' => $m['type'],
                    'target' => $m['target'],
                    'port' => $m['port'] ?? null,
                    'config' => $m['config'] ?? null,
                    'check_interval_seconds' => $m['interval'],
                    'timeout_seconds' => 30,
                    'confirmation_failures' => 3,
                    'confirmation_successes' => 2,
                    'status' => $m['status'],
                    'status_since' => now()->subHours(rand(1, 48)),
                    'last_checked_at' => now()->subSeconds(rand(5, 60)),
                    'last_response_time_ms' => $m['status'] === 'down' ? null : rand(20, 250),
                    'next_check_at' => now()->addSeconds($m['interval']),
                    'heartbeat_token' => $m['type'] === 'heartbeat' ? Str::random(48) : null,
                    'heartbeat_last_ping_at' => $m['type'] === 'heartbeat' ? now()->subMinutes(2) : null,
                ]
            );
            $created[$m['name']] = $monitor;

            for ($h = 7 * 24; $h >= 1; $h--) {
                $bucket = now()->subHours($h)->startOfHour();
                $isDownPeriod = $m['status'] === 'down' && $h <= 1;
                $upChecks = $isDownPeriod ? 0 : rand(55, 60);

                CheckRollupHourly::updateOrCreate(
                    ['monitor_id' => $monitor->id, 'hour_bucket' => $bucket],
                    [
                        'total_checks' => 60,
                        'up_checks' => $upChecks,
                        'down_checks' => 60 - $upChecks,
                        'degraded_checks' => 0,
                        'avg_response_time_ms' => rand(40, 200),
                        'min_response_time_ms' => rand(10, 39),
                        'max_response_time_ms' => rand(201, 400),
                        'uptime_pct' => round(($upChecks / 60) * 100, 3),
                    ]
                );
            }
        }

        Incident::updateOrCreate(
            ['organization_id' => $org->id, 'monitor_id' => $created['api.bharatpay.in']->id, 'state' => 'investigating'],
            [
                'title' => 'api.bharatpay.in is down — Connection timeout after 30000ms',
                'severity' => 'critical',
                'is_auto_created' => true,
                'started_at' => now()->subMinutes(14),
            ]
        );

        $statusPage = StatusPage::updateOrCreate(
            ['organization_id' => $org->id, 'slug' => 'bharatpay-status'],
            ['name' => 'BharatPay Status', 'primary_color' => '#2E4FA3', 'is_published' => true]
        );
        $statusPage->components()->delete();
        foreach (['bharatpay.in' => 'Website', 'api.bharatpay.in' => 'API', 'db-primary' => 'Payment Processing'] as $monitorName => $label) {
            $statusPage->components()->create([
                'monitor_id' => $created[$monitorName]->id,
                'name' => $label,
                'sort_order' => 0,
            ]);
        }

        $this->command->info('Demo organization seeded. Login: ravi@bharatpay.in / Demo@2026 (org_admin), priya@bharatpay.in / Demo@2026 (operator)');
    }
}
