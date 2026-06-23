<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServerMetric extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'monitor_id', 'cpu_usage_pct', 'ram_usage_pct', 'disk_usage_pct', 'interfaces', 'created_at',
    ];

    protected $casts = [
        'cpu_usage_pct' => 'float',
        'ram_usage_pct' => 'float',
        'disk_usage_pct' => 'float',
        'interfaces' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (ServerMetric $metric) {
            $metric->created_at ??= now();
        });
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
