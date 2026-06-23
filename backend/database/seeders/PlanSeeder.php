<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'key' => 'free', 'name' => 'Free',
                'monitor_limit' => 10, 'team_member_limit' => 2,
                'check_interval_min_seconds' => 300, 'status_page_limit' => 1,
                'price_inr_monthly' => 0, 'price_usd_monthly' => 0,
                'features' => ['email_alerts'],
            ],
            [
                'key' => 'starter', 'name' => 'Starter',
                'monitor_limit' => 50, 'team_member_limit' => 5,
                'check_interval_min_seconds' => 60, 'status_page_limit' => 3,
                'price_inr_monthly' => 999, 'price_usd_monthly' => 15,
                'features' => ['email_alerts', 'sms_alerts', 'slack_alerts', 'telegram_alerts'],
            ],
            [
                'key' => 'professional', 'name' => 'Professional',
                'monitor_limit' => 200, 'team_member_limit' => 20,
                'check_interval_min_seconds' => 30, 'status_page_limit' => 10,
                'price_inr_monthly' => 2999, 'price_usd_monthly' => 45,
                'features' => ['email_alerts', 'sms_alerts', 'whatsapp_alerts', 'slack_alerts', 'telegram_alerts', 'webhook_alerts', 'api_access', 'custom_roles'],
            ],
            [
                'key' => 'enterprise', 'name' => 'Enterprise',
                'monitor_limit' => 999999, 'team_member_limit' => 999999,
                'check_interval_min_seconds' => 30, 'status_page_limit' => 999999,
                'price_inr_monthly' => 0, 'price_usd_monthly' => 0,
                'features' => ['email_alerts', 'sms_alerts', 'whatsapp_alerts', 'slack_alerts', 'telegram_alerts', 'webhook_alerts', 'api_access', 'custom_roles', 'white_label', 'sla_reports', 'priority_support'],
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['key' => $plan['key']], $plan);
        }
    }
}
