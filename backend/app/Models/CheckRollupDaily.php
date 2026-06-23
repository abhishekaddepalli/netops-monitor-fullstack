<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckRollupDaily extends Model
{
    protected $table = 'check_rollups_daily';

    protected $fillable = [
        'monitor_id', 'day_bucket', 'total_checks', 'up_checks', 'down_checks',
        'degraded_checks', 'avg_response_time_ms', 'uptime_pct', 'downtime_seconds',
    ];

    protected $casts = [
        'day_bucket' => 'date',
        'uptime_pct' => 'float',
    ];

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
