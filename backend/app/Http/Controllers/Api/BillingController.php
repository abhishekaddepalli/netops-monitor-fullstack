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
    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'plan_key' => 'required|exists:plans,key',
            'payment_method' => 'required|in:stripe,razorpay,upi',
        ]);

        $organization = $request->user()->organization;
        $plan = Plan::where('key', $request->plan_key)->first();

        // End any existing active subscriptions
        $organization->subscriptions()->whereIn('status', ['active', 'trialing'])->update(['status' => 'canceled', 'canceled_at' => now()]);

        // Create new subscription
        $subscription = Subscription::create([
            'organization_id' => $organization->id,
            'plan_id' => $plan->id,
            'status' => $request->payment_method === 'upi' ? 'trialing' : 'active',
            'billing_provider' => $request->payment_method,
            'provider_subscription_id' => 'sub_' . Str::random(12),
            'current_period_starts_at' => now(),
            'current_period_ends_at' => now()->addMonth(),
        ]);

        // Update org's basic fields to reflect limits
        $organization->update([
            'plan' => $plan->key,
            'monitor_limit' => $plan->monitor_limit,
            'team_member_limit' => $plan->team_member_limit,
        ]);

        // Create initial invoice
        $invoice = Invoice::create([
            'organization_id' => $organization->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
            'amount' => $plan->price_inr_monthly,
            'currency' => 'INR',
            'status' => $request->payment_method === 'upi' ? 'open' : 'paid',
            'provider_invoice_id' => 'pi_' . Str::random(12),
            'due_at' => now()->addDays(3),
            'paid_at' => $request->payment_method === 'upi' ? null : now(),
        ]);

        return response()->json([
            'subscription' => $subscription,
            'invoice' => $invoice,
            'message' => 'Subscription created successfully. If paying via UPI, please pay the generated invoice to activate fully.',
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $organization = $request->user()->organization;
        $subscription = $organization->subscriptions()->with('plan')->whereIn('status', ['active', 'trialing'])->first();
        return response()->json(['subscription' => $subscription]);
    }
}
