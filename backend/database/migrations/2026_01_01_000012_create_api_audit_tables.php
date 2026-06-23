<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Laravel Sanctum's standard table — used for both SPA session auth
        // and long-lived API tokens (api_keys below wraps this for org-level keys).
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        // Org-level API keys (distinct from per-user tokens) — these are what
        // the spec's "Generate API Keys" / OAuth2-style programmatic access uses.
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('key_prefix', 12); // shown to user, e.g. "nom_live_a1b2"
            $table->string('key_hash'); // sha256 of full key, full key shown once on creation
            $table->json('scopes')->nullable(); // ['monitors:read','monitors:write','incidents:read',...]
            $table->json('ip_whitelist')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'is_active']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // e.g. monitor.created, monitor.deleted, user.role_changed
            $table->string('subject_type')->nullable(); // morph-style: App\Models\Monitor
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('changes')->nullable(); // {before: {...}, after: {...}}
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });

        Schema::create('rate_limit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('key'); // ip or api_key_id based bucket
            $table->unsignedInteger('hits')->default(1);
            $table->timestamp('window_started_at');
            $table->timestamps();

            $table->index(['key', 'window_started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_limit_logs');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('personal_access_tokens');
    }
};
