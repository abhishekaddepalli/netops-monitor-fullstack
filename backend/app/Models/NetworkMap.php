<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NetworkMap extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'background_image',
        'background_color',
        'grid_size',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function nodes()
    {
        return $this->hasMany(NetworkMapNode::class);
    }

    public function links()
    {
        return $this->hasMany(NetworkMapLink::class);
    }
}
