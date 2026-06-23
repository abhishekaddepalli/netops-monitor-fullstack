<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonitoringNode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MonitoringNodeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(MonitoringNode::withCount('monitors')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'key' => ['required', 'string', 'max:50', 'unique:monitoring_nodes,key'],
            'name' => ['required', 'string', 'max:255'],
            'region_code' => ['required', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'provider' => ['nullable', 'string', 'max:255'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $node = MonitoringNode::create($validator->validated());

        return response()->json($node, 201);
    }

    public function update(Request $request, MonitoringNode $monitoring_node): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'region_code' => ['sometimes', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'provider' => ['nullable', 'string', 'max:255'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $monitoring_node->update($validator->validated());

        return response()->json($monitoring_node);
    }
}
