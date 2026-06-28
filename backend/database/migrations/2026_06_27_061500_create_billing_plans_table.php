<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('billing_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('price', 8, 2)->default(0);
            $table->integer('max_monitors')->default(5);
            $table->json('allowed_monitor_types')->nullable(); // e.g. ["ping", "http", "keyword", "snmp"]
            $table->json('allowed_tools')->nullable(); // e.g. ["ping", "dns", "port", "ssl", "whois", "traceroute", "ipinfo", "headers", "blacklist", "ipreputation", "snmp", "network-discovery"]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('billing_plans');
    }
};
