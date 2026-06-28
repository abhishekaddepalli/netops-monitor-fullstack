<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'organization_id', 'subscription_id', 'invoice_number', 'amount', 'currency',
        'status', 'provider_invoice_id', 'receipt_path', 'pdf_path', 'due_at', 'paid_at',
    ];

    protected $casts = [
        'due_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
