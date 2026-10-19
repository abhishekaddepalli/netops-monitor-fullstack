<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('network_maps', function (Blueprint $table) {
            $table->string('background_color')->default('#0b1121')->after('background_image');
            $table->integer('grid_size')->default(20)->after('background_color');
        });

        Schema::table('network_map_nodes', function (Blueprint $table) {
            $table->string('shape')->default('rounded_rect')->after('icon_type');
            $table->string('color')->nullable()->after('shape');
            $table->integer('width')->default(170)->after('color');
            $table->integer('height')->default(0)->after('width');
            $table->uuid('submap_id')->nullable()->after('monitor_id');
            $table->foreign('submap_id')->references('id')->on('network_maps')->nullOnDelete();
        });

        Schema::table('network_map_links', function (Blueprint $table) {
            $table->string('snmp_interface_id')->nullable()->after('target_node_id');
            $table->boolean('show_traffic')->default(false)->after('snmp_interface_id');
        });
    }

    public function down()
    {
        Schema::table('network_maps', function (Blueprint $table) {
            $table->dropColumn('background_color');
            $table->dropColumn('grid_size');
        });

        Schema::table('network_map_nodes', function (Blueprint $table) {
            $table->dropForeign(['submap_id']);
            $table->dropColumn(['shape', 'color', 'width', 'height', 'submap_id']);
        });

        Schema::table('network_map_links', function (Blueprint $table) {
            $table->dropColumn(['snmp_interface_id', 'show_traffic']);
        });
    }
};
