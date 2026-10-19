<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NetworkMapNode extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'network_map_id',
        'monitor_id',
        'label',
        'x_pos',
        'y_pos',
        'icon_type',
        'shape',
        'color',
        'width',
        'height',
        'submap_id',
    ];

    public function networkMap()
    {
        return $this->belongsTo(NetworkMap::class);
    }

    public function monitor()
    {
        return $this->belongsTo(Monitor::class);
    }
}
