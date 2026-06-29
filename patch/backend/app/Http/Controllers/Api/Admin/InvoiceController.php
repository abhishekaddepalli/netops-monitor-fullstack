<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['organization:id,name', 'subscription:id,plan']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($orgId = $request->query('organization_id')) {
            $query->where('organization_id', $orgId);
        }

        if ($search = $request->query('search')) {
            $query->where(fn($q) => $q->where('invoice_number', 'like', "%{$search}%")
                                      ->orWhereHas('organization', fn($o) => $o->where('name', 'like', "%{$search}%")));
        }

        $invoices = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 25));

        return response()->json($invoices);
    }

    public function show($id): JsonResponse
    {
        $invoice = Invoice::with(['organization', 'subscription.plan'])->findOrFail($id);
        
        $settings = \App\Models\GlobalSetting::whereIn('key', [
            'company_name', 'company_address', 'company_gst', 'invoice_prefix'
        ])->pluck('value', 'key')->toArray();

        return response()->json([
            'invoice' => $invoice,
            'company' => $settings,
        ]);
    }
}
