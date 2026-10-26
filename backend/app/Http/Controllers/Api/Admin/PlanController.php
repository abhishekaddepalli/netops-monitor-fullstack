<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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
            'check_interval_min_seconds' => ['required', 'integer', 'min:5'],
            'status_page_limit' => ['required', 'integer', 'min:-1'],
            'price_inr_monthly' => ['required', 'numeric', 'min:0'],
            'price_inr_half_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_daily' => ['nullable', 'numeric', 'min:0'],
            'alert_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'api_request_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'integration_limit' => ['nullable', 'integer', 'min:-1'],
            'is_public' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'features' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $this->sanitizeData($validator->validated());
            $plan = Plan::create($data);

            return response()->json($plan, 201);
        } catch (\Throwable $e) {
            Log::error('PlanController store error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to create plan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'monitor_limit' => ['sometimes', 'integer', 'min:-1'],
            'team_member_limit' => ['sometimes', 'integer', 'min:-1'],
            'check_interval_min_seconds' => ['sometimes', 'integer', 'min:5'],
            'status_page_limit' => ['sometimes', 'integer', 'min:-1'],
            'price_inr_monthly' => ['sometimes', 'numeric', 'min:0'],
            'price_inr_half_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_inr_daily' => ['nullable', 'numeric', 'min:0'],
            'alert_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'api_request_limit_monthly' => ['nullable', 'integer', 'min:-1'],
            'integration_limit' => ['nullable', 'integer', 'min:-1'],
            'is_public' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'features' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = $this->sanitizeData($validator->validated());
            $plan->update($data);

            return response()->json($plan);
        } catch (\Throwable $e) {
            Log::error('PlanController update error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to update plan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Plan $plan): JsonResponse
    {
        try {
            $plan->delete();
            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('PlanController destroy error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete plan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Normalize and sanitize plan payload data to prevent DB constraints issues.
     */
    protected function sanitizeData(array $data): array
    {
        // Safe fallbacks for pricing numbers
        if (array_key_exists('price_inr_daily', $data)) {
            $data['price_inr_daily'] = (float)($data['price_inr_daily'] ?? 0);
        }
        if (array_key_exists('price_inr_monthly', $data)) {
            $data['price_inr_monthly'] = (float)($data['price_inr_monthly'] ?? 0);
        }
        if (array_key_exists('price_inr_half_yearly', $data)) {
            $data['price_inr_half_yearly'] = (float)($data['price_inr_half_yearly'] ?? 0);
        }
        if (array_key_exists('price_inr_yearly', $data)) {
            $data['price_inr_yearly'] = (float)($data['price_inr_yearly'] ?? 0);
        }

        // Safe integer limits (-1 means unlimited)
        if (array_key_exists('monitor_limit', $data)) {
            $data['monitor_limit'] = (int)$data['monitor_limit'];
        }
        if (array_key_exists('team_member_limit', $data)) {
            $data['team_member_limit'] = (int)$data['team_member_limit'];
        }
        if (array_key_exists('status_page_limit', $data)) {
            $data['status_page_limit'] = (int)$data['status_page_limit'];
        }
        if (array_key_exists('check_interval_min_seconds', $data)) {
            $data['check_interval_min_seconds'] = (int)$data['check_interval_min_seconds'];
        }
        if (array_key_exists('alert_limit_monthly', $data)) {
            $data['alert_limit_monthly'] = $data['alert_limit_monthly'] !== null ? (int)$data['alert_limit_monthly'] : -1;
        }
        if (array_key_exists('api_request_limit_monthly', $data)) {
            $data['api_request_limit_monthly'] = $data['api_request_limit_monthly'] !== null ? (int)$data['api_request_limit_monthly'] : -1;
        }
        if (array_key_exists('integration_limit', $data)) {
            $data['integration_limit'] = $data['integration_limit'] !== null ? (int)$data['integration_limit'] : -1;
        }

        // Booleans
        if (array_key_exists('is_public', $data)) {
            $data['is_public'] = (bool)$data['is_public'];
        }
        if (array_key_exists('is_active', $data)) {
            $data['is_active'] = (bool)$data['is_active'];
        }

        // Array features
        if (array_key_exists('features', $data) && is_array($data['features'])) {
            $data['features'] = array_values(array_unique(array_filter($data['features'])));
        }

        return $data;
    }
}
