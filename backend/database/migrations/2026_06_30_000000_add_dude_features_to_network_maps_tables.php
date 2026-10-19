<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('network_maps')) {
            Schema::table('network_maps', function (Blueprint $table) {
                if (!Schema::hasColumn('network_maps', 'background_color')) {
                    $table->string('background_color')->default('#0b1121')->after('background_image');
                }
                if (!Schema::hasColumn('network_maps', 'grid_size')) {
                    $table->integer('grid_size')->default(20)->after('background_color');
                }
            });
        }

        if (Schema::hasTable('network_map_nodes')) {
            Schema::table('network_map_nodes', function (Blueprint $table) {
                if (!Schema::hasColumn('network_map_nodes', 'shape')) {
                    $table->string('shape')->default('rounded_rect')->after('icon_type');
                }
                if (!Schema::hasColumn('network_map_nodes', 'color')) {
                    $table->string('color')->nullable()->after('shape');
                }
                if (!Schema::hasColumn('network_map_nodes', 'width')) {
                    $table->integer('width')->default(170)->after('color');
                }
                if (!Schema::hasColumn('network_map_nodes', 'height')) {
                    $table->integer('height')->default(0)->after('width');
                }
                if (!Schema::hasColumn('network_map_nodes', 'submap_id')) {
                    $table->uuid('submap_id')->nullable()->after('monitor_id');
                    $table->foreign('submap_id')->references('id')->on('network_maps')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('network_map_links')) {
            Schema::table('network_map_links', function (Blueprint $table) {
                if (!Schema::hasColumn('network_map_links', 'snmp_interface_id')) {
                    $table->string('snmp_interface_id')->nullable()->after('target_node_id');
                }
                if (!Schema::hasColumn('network_map_links', 'show_traffic')) {
                    $table->boolean('show_traffic')->default(false)->after('snmp_interface_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('network_map_links')) {
            Schema::table('network_map_links', function (Blueprint $table) {
                $cols = [];
                if (Schema::hasColumn('network_map_links', 'snmp_interface_id')) $cols[] = 'snmp_interface_id';
                if (Schema::hasColumn('network_map_links', 'show_traffic')) $cols[] = 'show_traffic';
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }

        if (Schema::hasTable('network_map_nodes')) {
            Schema::table('network_map_nodes', function (Blueprint $table) {
                if (Schema::hasColumn('network_map_nodes', 'submap_id')) {
                    try {
                        $table->dropForeign(['submap_id']);
                    } catch (\Throwable $e) {}
                }
                $cols = [];
                foreach (['shape', 'color', 'width', 'height', 'submap_id'] as $col) {
                    if (Schema::hasColumn('network_map_nodes', $col)) $cols[] = $col;
                }
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }

        if (Schema::hasTable('network_maps')) {
            Schema::table('network_maps', function (Blueprint $table) {
                $cols = [];
                if (Schema::hasColumn('network_maps', 'background_color')) $cols[] = 'background_color';
                if (Schema::hasColumn('network_maps', 'grid_size')) $cols[] = 'grid_size';
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};
