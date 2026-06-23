<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // free | starter | professional | enterprise
            $table->string('name');
            $table->unsignedInteger('monitor_limit');
            $table->unsignedInteger('team_member_limit');
            $table->unsignedInteger('check_interval_min_seconds')->default(60); // fastest interval allowed
            $table->unsignedInteger('status_page_limit')->default(1);
            $table->unsignedInteger('price_inr_monthly')->default(0); // paise-free, store rupees
            $table->unsignedInteger('price_usd_monthly')->default(0);
            $table->json('features')->nullable(); // ['sms_alerts','white_label','api_access',...]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained();
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled', 'expired'])->default('trialing');
            $table->enum('billing_provider', ['razorpay', 'stripe', 'paypal', 'manual'])->nullable();
            $table->string('provider_subscription_id')->nullable();
            $table->timestamp('current_period_starts_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number')->unique();
            $table->unsignedInteger('amount'); // smallest currency unit
            $table->string('currency', 3)->default('INR');
            $table->enum('status', ['draft', 'open', 'paid', 'void', 'uncollectible'])->default('open');
            $table->string('provider_invoice_id')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
    }
};
