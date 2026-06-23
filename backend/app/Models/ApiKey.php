<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    protected $fillable = [
        'organization_id', 'created_by', 'name', 'key_prefix', 'key_hash',
        'scopes', 'ip_whitelist', 'last_used_at', 'expires_at', 'is_active',
    ];

    protected $casts = [
        'scopes' => 'array',
        'ip_whitelist' => 'array',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected $hidden = ['key_hash'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Generate a new key. Returns [model, plaintextKey] — the plaintext is
     * shown to the user exactly once and never stored.
     */
    public static function generate(Organization $org, string $name, array $scopes = [], ?User $creator = null): array
    {
        $plaintext = 'nom_live_'.Str::random(40);
        $prefix = substr($plaintext, 0, 12);

        $key = self::create([
            'organization_id' => $org->id,
            'created_by' => $creator?->id,
            'name' => $name,
            'key_prefix' => $prefix,
            'key_hash' => hash('sha256', $plaintext),
            'scopes' => $scopes ?: ['monitors:read', 'incidents:read'],
        ]);

        return [$key, $plaintext];
    }

    public static function findByPlaintext(string $plaintext): ?self
    {
        return self::where('key_hash', hash('sha256', $plaintext))
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->first();
    }

    public function hasScope(string $scope): bool
    {
        return in_array($scope, $this->scopes ?? [], true);
    }
}
