<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Monitor extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id', 'team_id', 'created_by', 'escalation_policy_id',
        'name', 'type', 'target', 'port', 'config',
        'check_interval_seconds', 'timeout_seconds',
        'confirmation_failures', 'confirmation_successes',
        'status', 'is_paused', 'maintenance_mode', 'maintenance_until',
        'tags', 'sort_order', 'last_checked_at', 'last_response_time_ms',
    ];

    protected $casts = [
        'config' => 'array',
        'tags' => 'array',
        'is_paused' => 'boolean',
        'maintenance_mode' => 'boolean',
        'maintenance_until' => 'datetime',
        'status_since' => 'datetime',
        'last_checked_at' => 'datetime',
        'next_check_at' => 'datetime',
        'heartbeat_last_ping_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Monitor $monitor) {
            $monitor->uuid ??= (string) Str::uuid();
            if ($monitor->type === 'heartbeat') {
                $monitor->heartbeat_token ??= Str::random(48);
            }
            $monitor->next_check_at ??= now();
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function escalationPolicy(): BelongsTo
    {
        return $this->belongsTo(EscalationPolicy::class);
    }

    public function checks(): HasMany
    {
        return $this->hasMany(Check::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function sslCertificate(): HasOne
    {
        return $this->hasOne(SslCertificate::class);
    }

    public function nodes(): BelongsToMany
    {
        return $this->belongsToMany(MonitoringNode::class, 'monitor_node');
    }

    public function hourlyRollups(): HasMany
    {
        return $this->hasMany(CheckRollupHourly::class);
    }

    public function dailyRollups(): HasMany
    {
        return $this->hasMany(CheckRollupDaily::class);
    }

    public function activeIncident(): HasOne
    {
        return $this->hasOne(Incident::class)->whereNot('state', 'resolved')->latestOfMany();
    }

    public function serverMetrics(): HasMany
    {
        return $this->hasMany(ServerMetric::class);
    }

    public function heartbeatUrl(): string
    {
        return rtrim(config('app.url'), '/')."/hb/{$this->heartbeat_token}";
    }

    public function isInMaintenanceWindow(): bool
    {
        return $this->maintenance_mode
            && (! $this->maintenance_until || $this->maintenance_until->isFuture());
    }

    /**
     * Apply the result of a single check to the monitor's running state machine.
     * Returns true if this check caused a status change (used by the caller to
     * decide whether to fire incident-creation / resolution logic).
     */
    public function applyCheckResult(string $result, int $confirmationFailures, int $confirmationSuccesses): bool
    {
        $previousStatus = $this->status;

        if ($result === 'up') {
            $this->consecutive_successes++;
            $this->consecutive_failures = 0;

            if (in_array($this->status, ['down', 'degraded'], true) && $this->consecutive_successes >= $confirmationSuccesses) {
                $this->status = 'up';
            } elseif ($this->status === 'pending') {
                $this->status = 'up';
            }
        } elseif ($result === 'degraded') {
            $this->consecutive_successes = 0;
            $this->status = 'degraded';
        } else { // down
            $this->consecutive_failures++;
            $this->consecutive_successes = 0;

            if ($this->status === 'pending' || (in_array($this->status, ['up', 'degraded'], true)
                && $this->consecutive_failures >= $confirmationFailures)) {
                $this->status = 'down';
            }
        }

        $changed = $this->status !== $previousStatus;
        if ($changed) {
            $this->status_since = now();
        }

        return $changed;
    }

    public function scheduleNextCheck(): void
    {
        $this->next_check_at = now()->addSeconds($this->check_interval_seconds);
    }
}
