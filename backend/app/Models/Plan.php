<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'key', 'name', 'monitor_limit', 'team_member_limit', 'check_interval_min_seconds',
        'status_page_limit', 'price_inr_monthly', 'price_usd_monthly', 'features', 'is_active',
        'price_inr_half_yearly', 'price_inr_yearly', 'price_inr_daily',
        'alert_limit_monthly', 'api_request_limit_monthly', 'integration_limit',
    ];

    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }
}
