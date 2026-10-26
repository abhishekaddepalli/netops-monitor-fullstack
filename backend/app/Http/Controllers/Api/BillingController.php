<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BillingController extends Controller
{
    public function cancelDraft(Request $request): JsonResponse
    {
        $organization = $request->user()->organization;
        // Find any trialing subscription and open invoice
        $subscription = Subscription::where('organization_id', $organization->id)
            ->where('status', 'trialing')
            ->latest()
            ->first();

        if ($subscription) {
            Invoice::where('subscription_id', $subscription->id)
                ->where('status', 'open')
                ->whereNull('receipt_path')
                ->delete();
            $subscription->delete();
            return response()->json(['message' => 'Draft cancelled']);
        }
        return response()->json(['message' => 'No draft found']);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'plan_key' => 'required|exists:plans,key',
            'payment_method' => 'required|in:stripe,razorpay,upi',
            'billing_cycle' => 'sometimes|in:monthly,half_yearly,yearly',
        ]);

        $organization = $request->user()->organization;
        $plan = Plan::where('key', $request->plan_key)->first();
        $cycle = $request->billing_cycle ?? 'monthly';

        // End any existing active subscriptions
        $organization->subscriptions()->whereIn('status', ['active', 'trialing'])->update(['status' => 'canceled', 'canceled_at' => now()]);

        $amount = $plan->price_inr_monthly;
        $endDate = now()->addMonth();

        if ($cycle === 'half_yearly') {
            $amount = $plan->price_inr_half_yearly ?? ($plan->price_inr_monthly * 6);
            $endDate = now()->addMonths(6);
        } elseif ($cycle === 'yearly') {
            $amount = $plan->price_inr_yearly ?? ($plan->price_inr_monthly * 12);
            $endDate = now()->addYear();
        }

        if ($request->payment_method === 'upi') {
            $request->validate([
                'utr_number' => 'required|string|max:255',
                'receipt_file' => 'required|image|max:5120' // Max 5MB image
            ]);
        }

        // Handle Razorpay specific logic
        $settings = json_decode(\Illuminate\Support\Facades\Storage::get('global_settings.json'), true) ?? [];
        $razorpayOrderId = null;
        if ($request->payment_method === 'razorpay') {
            $key = $settings['razorpay_key'] ?? config('services.razorpay.key');
            $secret = $settings['razorpay_secret'] ?? config('services.razorpay.secret');
            if ($key && $secret) {
                try {
                    $api = new \Razorpay\Api\Api($key, $secret);
                    $order = $api->order->create([
                        'receipt' => 'rcpt_' . $organization->id . '_' . time(),
                        'amount' => $amount * 100, // paise
                        'currency' => 'INR',
                        'payment_capture' => 1
                    ]);
                    $razorpayOrderId = $order['id'];
                } catch (\Exception $e) {
                    return response()->json(['message' => 'Razorpay Error: ' . $e->getMessage()], 500);
                }
            } else {
                return response()->json(['message' => 'Razorpay keys not configured.'], 500);
            }
        }

        // Create new subscription
        $subscription = Subscription::create([
            'organization_id' => $organization->id,
            'plan_id' => $plan->id,
            'billing_cycle' => $cycle,
            'status' => 'trialing', // trialing acts as pending until verified or approved
            'billing_provider' => $request->payment_method === 'upi' ? 'manual' : $request->payment_method,
            'provider_subscription_id' => $razorpayOrderId ?? 'sub_' . Str::random(12),
            'current_period_starts_at' => now(),
            'current_period_ends_at' => $endDate,
        ]);

        // Handle file upload
        $receiptPath = null;
        if ($request->hasFile('receipt_file')) {
            $receiptPath = $request->file('receipt_file')->store('receipts', 'public');
        }

        // Create initial invoice
        $invoice = Invoice::create([
            'organization_id' => $organization->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
            'amount' => $amount,
            'currency' => 'INR',
            'status' => 'open', // Always open until verified
            'provider_invoice_id' => $request->payment_method === 'upi' ? $request->utr_number : 'pi_' . Str::random(12),
            'receipt_path' => $receiptPath,
            'due_at' => now()->addDays(3),
            'paid_at' => null,
        ]);

        if ($request->payment_method === 'upi') {
            try {
                $adminEmail = config('mail.from.address');
                if ($adminEmail) {
                    $html = view('emails.notification', [
                        'appName' => $settings['app_name'] ?? 'NetOps Monitor',
                        'primaryColor' => $settings['primary_color'] ?? '#2E4FA3',
                        'title' => 'New UPI Payment Requires Approval',
                        'messageText' => "Organization '{$organization->name}' has submitted a new UPI payment that requires your approval.",
                        'details' => [
                            'Invoice Number' => $invoice->invoice_number,
                            'Amount' => 'INR ' . $amount,
                            'UTR Number' => $request->utr_number,
                            'Organization' => $organization->name
                        ],
                    ])->render();
                    \Illuminate\Support\Facades\Mail::html($html, function ($msg) use ($adminEmail, $settings) {
                        $appName = $settings['app_name'] ?? 'NetOps Monitor';
                        $msg->to($adminEmail)->subject("{$appName} - Action Required: UPI Payment Pending");
                    });
                }
            } catch (\Exception $e) {}
        }

        return response()->json([
            'subscription' => $subscription,
            'invoice' => $invoice,
            'razorpay_order_id' => $razorpayOrderId,
            'razorpay_key' => $key ?? null,
            'message' => 'Subscription created successfully. Please complete the payment to activate.',
        ]);
    }

    public function verifyRazorpay(Request $request): JsonResponse
    {
        $request->validate([
            'razorpay_payment_id' => 'required',
            'razorpay_order_id' => 'required',
            'razorpay_signature' => 'required'
        ]);

        $settings = json_decode(\Illuminate\Support\Facades\Storage::get('global_settings.json'), true) ?? [];
        $key = $settings['razorpay_key'] ?? config('services.razorpay.key');
        $secret = $settings['razorpay_secret'] ?? config('services.razorpay.secret');
        $api = new \Razorpay\Api\Api($key, $secret);
        try {
            $api->utility->verifyPaymentSignature([
                'razorpay_signature'  => $request->razorpay_signature,
                'razorpay_payment_id' => $request->razorpay_payment_id,
                'razorpay_order_id'   => $request->razorpay_order_id,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Payment verification failed.'], 400);
        }

        $subscription = Subscription::with('plan', 'organization')->where('provider_subscription_id', $request->razorpay_order_id)->firstOrFail();
        $subscription->update(['status' => 'active']);
        
        $plan = $subscription->plan;
        if ($plan && $subscription->organization) {
            $subscription->organization->update([
                'plan' => $plan->key,
                'billing_cycle' => $subscription->billing_cycle ?? 'monthly',
                'monitor_limit' => $plan->monitor_limit,
                'team_member_limit' => $plan->team_member_limit,
            ]);
        }

        Invoice::where('subscription_id', $subscription->id)->update([
            'status' => 'paid',
            'paid_at' => now(),
            'provider_invoice_id' => $request->razorpay_payment_id
        ]);

        return response()->json(['message' => 'Payment successful! Subscription activated.']);
    }

    public function current(Request $request): JsonResponse
    {
        $organization = $request->user()->organization;
        $subscription = $organization->subscriptions()->with('plan')->whereIn('status', ['active', 'trialing'])->first();
        return response()->json(['subscription' => $subscription]);
    }

    public function invoices(Request $request): JsonResponse
    {
        $organization = $request->user()->organization;
        $invoices = Invoice::where('organization_id', $organization->id)
            ->with(['subscription.plan'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invoices);
    }
}
