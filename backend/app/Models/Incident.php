<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Incident extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id', 'monitor_id', 'title', 'severity', 'state',
        'is_auto_created', 'root_cause', 'resolution_notes', 'started_at',
        'acknowledged_at', 'acknowledged_by', 'resolved_at', 'resolved_by',
        'time_to_acknowledge_seconds', 'time_to_resolve_seconds',
        'show_on_status_page',
    ];

    protected $casts = [
        'is_auto_created' => 'boolean',
        'show_on_status_page' => 'boolean',
        'started_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Incident $incident) {
            $incident->uuid ??= (string) Str::uuid();
            $incident->started_at ??= now();
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(IncidentUpdate::class)->latest();
    }

    public function acknowledge(User $user, ?string $rootCause = null): void
    {
        if ($this->acknowledged_at) {
            return;
        }
        $this->acknowledged_at = now();
        $this->acknowledged_by = $user->id;
        if ($rootCause) {
            $this->root_cause = $rootCause;
        }
        $this->time_to_acknowledge_seconds = $this->started_at->diffInSeconds(now());
        $this->save();

        $this->updates()->create([
            'posted_by' => $user->id,
            'message' => $rootCause ? "Acknowledged by {$user->name}. Cause details: {$rootCause}" : "Acknowledged by {$user->name}.",
            'is_system_generated' => true,
        ]);
    }

    public function resolve(?User $user = null, ?string $notes = null): void
    {
        $this->state = 'resolved';
        $this->resolved_at = now();
        $this->resolved_by = $user?->id;
        $this->resolution_notes = $notes;
        $this->time_to_resolve_seconds = $this->started_at->diffInSeconds(now());
        $this->save();

        $this->updates()->create([
            'posted_by' => $user?->id,
            'state' => 'resolved',
            'message' => $notes ?? 'Monitor recovered — incident automatically resolved.',
            'is_system_generated' => $user === null,
        ]);

        // If manually resolved, instantly force the monitor back up
        if ($this->monitor && in_array($this->monitor->status, ['down', 'degraded'], true)) {
            $this->monitor->update([
                'status' => 'up',
                'consecutive_failures' => 0,
                'status_since' => now(),
            ]);
        }
    }
}
