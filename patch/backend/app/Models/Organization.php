<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'billing_email', 'plan', 'billing_cycle', 'monitor_limit', 'team_member_limit',
        'timezone', 'is_active', 'is_suspended', 'is_expired', 'suspension_reason',
        'white_label_enabled', 'white_label_domain', 'white_label_logo_path',
        'white_label_favicon_path', 'white_label_primary_color',
        'white_label_sender_email', 'white_label_sender_name', 'trial_ends_at',
        'default_monitoring_node_id', 'phone', 'address',
        'alert_email_enabled', 'alert_sms_enabled', 'alert_webhook_enabled',
        'alert_slack_enabled', 'alert_telegram_enabled',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_suspended' => 'boolean',
        'is_expired' => 'boolean',
        'white_label_enabled' => 'boolean',
        'trial_ends_at' => 'datetime',
        'alert_email_enabled' => 'boolean',
        'alert_sms_enabled' => 'boolean',
        'alert_webhook_enabled' => 'boolean',
        'alert_slack_enabled' => 'boolean',
        'alert_telegram_enabled' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Organization $org) {
            $org->uuid ??= (string) Str::uuid();
            $org->slug ??= Str::slug($org->name).'-'.Str::lower(Str::random(5));
        });
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_user')
            ->withPivot(['role', 'invited_at', 'joined_at', 'invited_by'])
            ->withTimestamps();
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function monitors(): HasMany
    {
        return $this->hasMany(Monitor::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function statusPages(): HasMany
    {
        return $this->hasMany(StatusPage::class);
    }

    public function alertChannels(): HasMany
    {
        return $this->hasMany(AlertChannel::class);
    }

    public function escalationPolicies(): HasMany
    {
        return $this->hasMany(EscalationPolicy::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function activeMonitorCount(): int
    {
        return $this->monitors()->whereNull('deleted_at')->count();
    }

    public function canAddMonitor(): bool
    {
        return $this->activeMonitorCount() < $this->monitor_limit;
    }
}
