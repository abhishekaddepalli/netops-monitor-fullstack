<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected $fillable = [
        'organization_id', 'name', 'email', 'password', 'phone', 'timezone',
        'system_role', 'avatar_path', 'is_active',
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'two_factor_enabled' => 'boolean',
        'is_active' => 'boolean',
        'ip_restrictions' => 'array',
        'last_login_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            $user->uuid ??= (string) Str::uuid();
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_user')
            ->withPivot(['role', 'invited_at', 'joined_at'])
            ->withTimestamps();
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_user')->withTimestamps();
    }

    public function isSuperAdmin(): bool
    {
        return $this->system_role === 'super_admin';
    }

    /** Coarse role within the user's primary organization. Use Spatie roles for granular permissions. */
    public function roleInOrganization(?Organization $org = null): ?string
    {
        if ($this->isSuperAdmin()) {
            return 'super_admin';
        }

        $org ??= $this->organization;
        if (! $org) {
            return null;
        }

        return $this->organizations()
            ->where('organizations.id', $org->id)
            ->first()?->pivot->role;
    }

    public function isOrgAdmin(?Organization $org = null): bool
    {
        return $this->roleInOrganization($org) === 'org_admin';
    }

    public function isOperatorOrAbove(?Organization $org = null): bool
    {
        return in_array($this->roleInOrganization($org), ['org_admin', 'operator'], true);
    }

    public function canManageBilling(): bool
    {
        return $this->isSuperAdmin() || $this->isOrgAdmin();
    }
}
