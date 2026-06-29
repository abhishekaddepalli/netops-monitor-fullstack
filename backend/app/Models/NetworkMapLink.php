<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NetworkMapLink extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'network_map_id',
        'source_node_id',
        'target_node_id',
        'monitor_id',
        'label',
        'interface_name',
        'color',
        'style',
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
