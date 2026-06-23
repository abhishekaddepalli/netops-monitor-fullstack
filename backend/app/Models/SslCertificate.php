<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SslCertificate extends Model
{
    protected $fillable = [
        'monitor_id', 'issuer', 'subject', 'signature_algorithm', 'serial_number',
        'certificate_chain', 'valid_from', 'valid_to', 'days_remaining',
        'is_valid', 'alert_thresholds_sent', 'checked_at',
    ];

    protected $casts = [
        'certificate_chain' => 'array',
        'alert_thresholds_sent' => 'array',
        'valid_from' => 'datetime',
        'valid_to' => 'datetime',
        'checked_at' => 'datetime',
        'is_valid' => 'boolean',
    ];

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function shouldAlertForThreshold(int $thresholdDays): bool
    {
        $sent = $this->alert_thresholds_sent ?? [];

        return $this->days_remaining !== null
            && $this->days_remaining <= $thresholdDays
            && ! in_array($thresholdDays, $sent, true);
    }
}
