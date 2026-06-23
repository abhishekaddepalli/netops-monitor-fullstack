<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckRollupHourly extends Model
{
    protected $table = 'check_rollups_hourly';

    protected $fillable = [
        'monitor_id', 'hour_bucket', 'total_checks', 'up_checks', 'down_checks',
        'degraded_checks', 'avg_response_time_ms', 'min_response_time_ms',
        'max_response_time_ms', 'uptime_pct',
    ];

    protected $casts = [
        'hour_bucket' => 'datetime',
        'uptime_pct' => 'float',
    ];

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
