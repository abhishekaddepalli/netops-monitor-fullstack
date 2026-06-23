<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        // Public endpoint to list all available plans for the landing page/pricing
        $plans = Plan::where('is_public', true)->orderBy('price_inr_monthly')->get();
        
        // If there are no plans marked public yet (or column is missing), fallback to all
        if ($plans->isEmpty()) {
            $plans = Plan::orderBy('price_inr_monthly')->get();
        }
        
        return response()->json($plans);
    }
}
