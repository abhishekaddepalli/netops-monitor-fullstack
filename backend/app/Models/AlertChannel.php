<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertChannel extends Model
{
    protected $fillable = ['organization_id', 'name', 'type', 'config', 'is_active', 'verified_at'];

    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
