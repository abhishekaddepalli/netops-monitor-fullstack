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

        // Create new subscription
        $subscription = Subscription::create([
            'organization_id' => $organization->id,
            'plan_id' => $plan->id,
            'status' => $request->payment_method === 'upi' ? 'trialing' : 'active',
            'billing_provider' => $request->payment_method,
            'provider_subscription_id' => 'sub_' . Str::random(12),
            'current_period_starts_at' => now(),
            'current_period_ends_at' => $endDate,
        ]);

        // Update org's basic fields to reflect limits
        $organization->update([
            'plan' => $plan->key,
            'billing_cycle' => $cycle,
            'monitor_limit' => $plan->monitor_limit,
            'team_member_limit' => $plan->team_member_limit,
        ]);

        // Create initial invoice
        $invoice = Invoice::create([
            'organization_id' => $organization->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-' . strtoupper(Str::random(8)),
            'amount' => $amount,
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
