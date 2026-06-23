<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Models\Monitor;
use App\Models\Incident;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        $mrr = \App\Models\Subscription::where('status', 'active')
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->sum('plans.price_inr_monthly');

        $recentSignups = Organization::orderByDesc('created_at')->take(5)->get(['id', 'name', 'created_at', 'plan']);

        $recentUsers = User::with('organization:id,name')->orderByDesc('created_at')->take(5)->get(['id', 'organization_id', 'name', 'email', 'created_at']);

        $recentInvoices = Invoice::with('organization:id,name')->orderByDesc('created_at')->take(5)->get(['id', 'invoice_number', 'organization_id', 'amount', 'currency', 'status', 'created_at']);

        $recentPayments = Invoice::with('organization:id,name')->where('status', 'paid')->orderByDesc('paid_at')->take(5)->get(['id', 'invoice_number', 'organization_id', 'amount', 'currency', 'status', 'paid_at']);

        $failedJobs = \Illuminate\Support\Facades\DB::table('failed_jobs')->count();

        return response()->json([
            'total_organizations' => Organization::count(),
            'total_users' => User::count(),
            'active_monitors' => Monitor::where('is_paused', false)->count(),
            'open_incidents' => Incident::whereIn('state', ['investigating', 'identified', 'monitoring'])->count(),
            'mrr' => $mrr,
            'recent_signups' => $recentSignups,
            'recent_users' => $recentUsers,
            'recent_invoices' => $recentInvoices,
            'recent_payments' => $recentPayments,
            'queue_health' => [
                'failed_jobs' => $failedJobs,
                'status' => $failedJobs > 0 ? 'degraded' : 'healthy'
            ]
        ]);
    }
}
