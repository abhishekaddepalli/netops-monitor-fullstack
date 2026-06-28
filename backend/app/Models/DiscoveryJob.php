<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiscoveryJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'seed_ip',
        'snmp_version',
        'community',
        'user',
        'auth_pass',
        'priv_pass',
        'is_active',
        'interval_minutes',
        'last_run_at'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
