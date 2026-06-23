<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class StatusPage extends Model
{
    protected $fillable = [
        'organization_id', 'name', 'slug', 'custom_domain', 'logo_path', 'favicon_path',
        'primary_color', 'support_url', 'show_uptime_history', 'uptime_history_days',
        'is_password_protected', 'password_hash', 'is_published',
    ];

    protected $casts = [
        'show_uptime_history' => 'boolean',
        'is_password_protected' => 'boolean',
        'is_published' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (StatusPage $page) {
            $page->uuid ??= (string) Str::uuid();
            $page->slug ??= Str::slug($page->name).'-'.Str::lower(Str::random(5));
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function components(): HasMany
    {
        return $this->hasMany(StatusPageComponent::class)->orderBy('sort_order');
    }

    public function maintenanceWindows(): HasMany
    {
        return $this->hasMany(StatusPageMaintenance::class);
    }

    /** Operational | Degraded | Partial Outage | Major Outage, computed from component monitors. */
    public function overallStatus(): string
    {
        $statuses = $this->components()->with('monitor')->get()
            ->pluck('monitor.status')
            ->filter()
            ->unique();

        if ($statuses->contains('down')) {
            return $statuses->count() > 1 ? 'partial_outage' : 'major_outage';
        }
        if ($statuses->contains('degraded')) {
            return 'degraded';
        }

        return 'operational';
    }
}
