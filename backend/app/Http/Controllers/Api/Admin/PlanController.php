<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Plan::all());
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'key' => ['required', 'string', 'max:50', 'unique:plans,key'],
            'name' => ['required', 'string', 'max:255'],
            'monitor_limit' => ['required', 'integer', 'min:-1'],
            'team_member_limit' => ['required', 'integer', 'min:-1'],
            'check_interval_min_seconds' => ['required', 'integer', 'min:10'],
            'status_page_limit' => ['required', 'integer', 'min:-1'],
            'price_inr_monthly' => ['required', 'numeric', 'min:0'],
            'price_inr_half_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_daily' => ['nullable', 'numeric', 'min:0'],
            'alert_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'api_request_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'integration_limit' => ['nullable', 'integer', 'min:-1'],
            'features' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $plan = Plan::create($validator->validated());

        return response()->json($plan, 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'monitor_limit' => ['sometimes', 'integer', 'min:-1'],
            'team_member_limit' => ['sometimes', 'integer', 'min:-1'],
            'check_interval_min_seconds' => ['sometimes', 'integer', 'min:10'],
            'status_page_limit' => ['sometimes', 'integer', 'min:-1'],
            'price_inr_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_inr_half_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_daily' => ['nullable', 'numeric', 'min:0'],
            'alert_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'api_request_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'integration_limit' => ['nullable', 'integer', 'min:-1'],
            'features' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $plan->update($validator->validated());

        return response()->json($plan);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        $plan->delete();
        return response()->json(null, 204);
    }
}
