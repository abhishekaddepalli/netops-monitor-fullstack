<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentUpdate extends Model
{
    protected $fillable = ['incident_id', 'posted_by', 'state', 'message', 'is_system_generated'];

    protected $casts = ['is_system_generated' => 'boolean'];

    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
