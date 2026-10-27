<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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

    public function approve($id): JsonResponse
    {
        $invoice = Invoice::with(['subscription.plan', 'organization'])->findOrFail($id);

        if ($invoice->status !== 'open') {
            return response()->json(['message' => 'Only open invoices can be approved.'], 400);
        }

        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $org = $invoice->organization ?? \App\Models\Organization::find($invoice->organization_id);

        if ($invoice->subscription) {
            $cycle = $invoice->subscription->billing_cycle ?? 'monthly';
            $endDate = match ($cycle) {
                'half_yearly' => now()->addMonths(6),
                'yearly' => now()->addYear(),
                'daily' => now()->addDay(),
                default => now()->addMonth(),
            };

            $invoice->subscription->update([
                'status' => 'active',
                'current_period_starts_at' => now(),
                'current_period_ends_at' => $endDate,
            ]);

            $plan = $invoice->subscription->plan;
            if ($plan && $org) {
                $org->update([
                    'plan' => $plan->key,
                    'billing_cycle' => $cycle,
                    'monitor_limit' => $plan->monitor_limit,
                    'team_member_limit' => $plan->team_member_limit,
                ]);
            }
        }

        try {
            MailService::sendInvoice($invoice);
        } catch (\Throwable $e) {
            Log::warning("Invoice approval email could not be sent: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Invoice approved successfully and confirmation email sent.',
            'invoice' => $invoice,
        ]);
    }

    public function deny($id): JsonResponse
    {
        $invoice = Invoice::with('subscription', 'organization')->findOrFail($id);

        if ($invoice->status !== 'open') {
            return response()->json(['message' => 'Only open invoices can be denied.'], 400);
        }

        $invoice->update([
            'status' => 'void',
        ]);

        if ($invoice->subscription) {
            $invoice->subscription->update(['status' => 'canceled']);
        }

        try {
            $org = $invoice->organization ?? \App\Models\Organization::find($invoice->organization_id);
            $to = $org?->billing_email ?: $org?->users()->first()?->email;
            if ($to) {
                MailService::sendNotification(
                    to: $to,
                    title: "Payment Verification Notice - Invoice #{$invoice->invoice_number}",
                    messageText: "We could not verify your recent payment for Invoice #{$invoice->invoice_number}.\n\nYour subscription has been canceled. Please contact support if you believe this is an error, and ensure your UTR/Transaction ID is correct.",
                    details: [
                        'Invoice Number' => $invoice->invoice_number,
                        'Amount' => 'INR ' . number_format((float) $invoice->amount, 2),
                        'Status' => 'Voided'
                    ],
                    actionUrl: config('app.url') . '/billing',
                    actionText: 'View Invoices'
                );
            }
        } catch (\Throwable $e) {
            Log::warning("Invoice denial email could not be sent: " . $e->getMessage());
        }

        return response()->json([
            'message' => 'Invoice denied successfully.',
            'invoice' => $invoice,
        ]);
    }

    public function sendEmail(Request $request, $id): JsonResponse
    {
        $invoice = Invoice::with(['subscription.plan', 'organization'])->findOrFail($id);
        $customEmail = $request->input('email');

        try {
            MailService::sendInvoice($invoice, $customEmail);
            return response()->json(['message' => 'Invoice email dispatched successfully.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to send invoice email: ' . $e->getMessage()], 422);
        }
    }
}
