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
            if ($invoice->organization && $invoice->organization->billing_email) {
                $settings = json_decode(\Illuminate\Support\Facades\Storage::get('global_settings.json'), true) ?? [];
                $html = view('emails.notification', [
                    'appName' => $settings['app_name'] ?? 'NetOps Monitor',
                    'primaryColor' => $settings['primary_color'] ?? '#2E4FA3',
                    'title' => 'Subscription Activated 🎉',
                    'messageText' => "Great news! Your recent payment for Invoice #{$invoice->invoice_number} has been verified and approved.\n\nYour organization's subscription plan is now fully active.",
                    'details' => [
                        'Invoice Number' => $invoice->invoice_number,
                        'Amount' => 'INR ' . $invoice->amount,
                        'Plan' => $invoice->subscription->plan->name ?? 'Premium Plan',
                        'Status' => 'Active'
                    ]
                ])->render();

                \Illuminate\Support\Facades\Mail::html($html, function ($msg) use ($invoice, $settings) {
                    $appName = $settings['app_name'] ?? 'NetOps Monitor';
                    $msg->to($invoice->organization->billing_email)->subject("{$appName} - Subscription Activated");
                });
            }
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'Invoice approved successfully.',
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
            if ($invoice->organization && $invoice->organization->billing_email) {
                $settings = json_decode(\Illuminate\Support\Facades\Storage::get('global_settings.json'), true) ?? [];
                $html = view('emails.notification', [
                    'appName' => $settings['app_name'] ?? 'NetOps Monitor',
                    'primaryColor' => '#e11d48',
                    'title' => 'Payment Denied',
                    'messageText' => "We could not verify your recent payment for Invoice #{$invoice->invoice_number}.\n\nYour subscription has been canceled. Please contact support if you believe this is an error, and ensure your UTR/Transaction ID is correct.",
                    'details' => [
                        'Invoice Number' => $invoice->invoice_number,
                        'Amount' => 'INR ' . $invoice->amount,
                        'Status' => 'Voided'
                    ]
                ])->render();

                \Illuminate\Support\Facades\Mail::html($html, function ($msg) use ($invoice, $settings) {
                    $appName = $settings['app_name'] ?? 'NetOps Monitor';
                    $msg->to($invoice->organization->billing_email)->subject("{$appName} - Payment Denied");
                });
            }
        } catch (\Exception $e) {}

        return response()->json([
            'message' => 'Invoice denied successfully.',
            'invoice' => $invoice,
        ]);
    }
}
