<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NetworkMapLink extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'network_map_id',
        'source_node_id',
        'target_node_id',
        'snmp_interface_id',
        'show_traffic',
        'monitor_id',
        'label',
        'interface_name',
        'color',
        'style',
    ];

    protected $casts = [
        'show_traffic' => 'boolean',
    ];

    public function networkMap()
    {
        return $this->belongsTo(NetworkMap::class);
    }

    public function sourceNode()
    {
        return $this->belongsTo(NetworkMapNode::class, 'source_node_id');
    }

    public function targetNode()
    {
        return $this->belongsTo(NetworkMapNode::class, 'target_node_id');
    }

    public function monitor()
    {
        return $this->belongsTo(Monitor::class);
    }
}
