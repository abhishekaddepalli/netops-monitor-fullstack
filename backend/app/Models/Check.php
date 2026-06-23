<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Check extends Model
{
    public $timestamps = false; // checked_at is the source of truth; created_at set manually below

    protected $fillable = [
        'monitor_id', 'monitoring_node_id', 'result', 'response_time_ms',
        'status_code', 'error_message', 'details', 'checked_at',
    ];

    protected $casts = [
        'details' => 'array',
        'checked_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Check $check) {
            $check->checked_at ??= now();
            $check->created_at ??= now();
            $check->updated_at ??= now();
        });
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function node(): BelongsTo
    {
        return $this->belongsTo(MonitoringNode::class, 'monitoring_node_id');
    }
}
