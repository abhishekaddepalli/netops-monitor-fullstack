<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DomainExpiration extends Model
{
    protected $fillable = [
        'monitor_id', 'organization_id', 'domain', 'registrar',
        'registered_at', 'expires_at', 'days_remaining',
        'alert_thresholds_sent', 'checked_at',
    ];

    protected $casts = [
        'alert_thresholds_sent' => 'array',
        'registered_at' => 'datetime',
        'expires_at' => 'datetime',
        'checked_at' => 'datetime',
    ];

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
