<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MonitoringNode extends Model
{
    protected $fillable = [
        'key', 'name', 'region_code', 'latitude', 'longitude', 'provider',
        'is_active', 'last_heartbeat_at', 'queue_depth', 'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_heartbeat_at' => 'datetime',
        'meta' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function monitors(): BelongsToMany
    {
        return $this->belongsToMany(Monitor::class, 'monitor_node');
    }

    public function isHealthy(): bool
    {
        return $this->is_active
            && $this->last_heartbeat_at
            && $this->last_heartbeat_at->gt(now()->subMinutes(5));
    }
}
