<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NetworkMap;
use App\Models\NetworkMapNode;
use App\Models\NetworkMapLink;
use App\Models\Monitor;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class NetworkMapController extends Controller
{
    /**
     * Resolve current organization safely from request attributes or authenticated user.
     */
    private function getOrganization(Request $request): ?Organization
    {
        $organization = $request->attributes->get('organization');
        if ($organization instanceof Organization) {
            return $organization;
        }

        $orgId = $request->attributes->get('org_id') ?? $request->user()?->organization_id;
        return $orgId ? Organization::find($orgId) : null;
    }

    /**
     * Display a listing of network maps for the organization.
     */
    public function index(Request $request): JsonResponse
    {
        $organization = $this->getOrganization($request);
        if (!$organization) {
            return response()->json(['message' => 'Unauthorized or missing organization context.'], 403);
        }

        $query = NetworkMap::where('organization_id', $organization->id);

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $maps = $query->withCount(['nodes', 'links'])
            ->latest()
            ->get();

        return response()->json(['maps' => $maps]);
    }

    /**
     * Display the specified network map with its topology.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $organization = $this->getOrganization($request);
        if (!$organization) {
            return response()->json(['message' => 'Unauthorized or missing organization context.'], 403);
        }

        $map = NetworkMap::where('organization_id', $organization->id)
            ->with(['nodes.monitor', 'links.monitor'])
            ->find($id);

        if (!$map) {
            return response()->json(['message' => 'Network map not found.'], 404);
        }

        return response()->json(['map' => $map]);
    }

    /**
     * Store a newly created network map.
     */
    public function store(Request $request): JsonResponse
    {
        $organization = $this->getOrganization($request);
        if (!$organization) {
            return response()->json(['message' => 'Unauthorized or missing organization context.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'background_image' => 'nullable|string|max:500',
            'background_color' => 'nullable|string|max:32',
            'grid_size' => 'nullable|integer|min:5|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $map = DB::transaction(function () use ($organization, $request) {
                return NetworkMap::create([
                    'organization_id' => $organization->id,
                    'name' => trim($request->input('name')),
                    'description' => $request->input('description'),
                    'background_image' => $request->input('background_image'),
                    'background_color' => $request->input('background_color', '#0b1121'),
                    'grid_size' => $request->input('grid_size', 20),
                ]);
            }, 5);

            return response()->json([
                'map' => $map,
                'message' => 'Network map created successfully.'
            ], 201);
        } catch (\Throwable $e) {
            Log::error('NetworkMap store error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to create network map.'], 500);
        }
    }

    /**
     * Update the specified network map and its node/link topology.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $organization = $this->getOrganization($request);
        if (!$organization) {
            return response()->json(['message' => 'Unauthorized or missing organization context.'], 403);
        }

        $map = NetworkMap::where('organization_id', $organization->id)->find($id);
        if (!$map) {
            return response()->json(['message' => 'Network map not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'background_color' => 'nullable|string|max:32',
            'background_image' => 'nullable|string|max:500',
            'grid_size' => 'nullable|integer|min:5|max:100',
            'nodes' => 'sometimes|array',
            'nodes.*.id' => 'nullable|string',
            'nodes.*.monitor_id' => 'nullable|integer',
            'nodes.*.label' => 'nullable|string|max:255',
            'nodes.*.x_pos' => 'nullable|numeric',
            'nodes.*.y_pos' => 'nullable|numeric',
            'nodes.*.icon_type' => 'nullable|string|max:64',
            'nodes.*.shape' => 'nullable|string|max:64',
            'nodes.*.color' => 'nullable|string|max:32',
            'nodes.*.width' => 'nullable|integer',
            'nodes.*.height' => 'nullable|integer',
            'nodes.*.submap_id' => 'nullable|string',
            'links' => 'sometimes|array',
            'links.*.id' => 'nullable|string',
            'links.*.source_node_id' => 'required_with:links|string',
            'links.*.target_node_id' => 'required_with:links|string',
            'links.*.snmp_interface_id' => 'nullable|string|max:64',
            'links.*.show_traffic' => 'nullable|boolean',
            'links.*.monitor_id' => 'nullable|integer',
            'links.*.label' => 'nullable|string|max:255',
            'links.*.interface_name' => 'nullable|string|max:128',
            'links.*.color' => 'nullable|string|max:32',
            'links.*.style' => 'nullable|string|max:64',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Cache valid monitor IDs and submap IDs strictly belonging to this tenant
        $validMonitorIds = Monitor::where('organization_id', $organization->id)->pluck('id')->flip()->all();
        $validSubmapIds = NetworkMap::where('organization_id', $organization->id)
            ->where('id', '!=', $map->id)
            ->pluck('id')
            ->flip()
            ->all();

        DB::beginTransaction();
        try {
            // Update map attributes if present
            $mapAttributes = [];
            if ($request->has('name')) {
                $mapAttributes['name'] = trim($request->input('name'));
            }
            if ($request->has('description')) {
                $mapAttributes['description'] = $request->input('description');
            }
            if ($request->has('background_color')) {
                $mapAttributes['background_color'] = $request->input('background_color');
            }
            if ($request->has('background_image')) {
                $mapAttributes['background_image'] = $request->input('background_image');
            }
            if ($request->has('grid_size')) {
                $mapAttributes['grid_size'] = $request->input('grid_size');
            }
            if (!empty($mapAttributes)) {
                $map->update($mapAttributes);
            }

            // Update topology if nodes are provided
            if ($request->has('nodes')) {
                // Delete existing links first, then nodes to respect FK constraints
                $map->links()->delete();
                $map->nodes()->delete();

                $nodeIdMap = [];
                $savedNodeIds = [];

                foreach ($request->input('nodes', []) as $nodeData) {
                    $rawId = $nodeData['id'] ?? null;
                    $nodeId = ($rawId && Str::isUuid($rawId)) ? $rawId : (string) Str::uuid();

                    if ($rawId) {
                        $nodeIdMap[$rawId] = $nodeId;
                    }
                    $nodeIdMap[$nodeId] = $nodeId;

                    $monitorId = isset($nodeData['monitor_id']) && isset($validMonitorIds[$nodeData['monitor_id']])
                        ? (int) $nodeData['monitor_id']
                        : null;

                    $submapId = isset($nodeData['submap_id']) && isset($validSubmapIds[$nodeData['submap_id']])
                        ? $nodeData['submap_id']
                        : null;

                    NetworkMapNode::create([
                        'id' => $nodeId,
                        'network_map_id' => $map->id,
                        'monitor_id' => $monitorId,
                        'label' => $nodeData['label'] ?? null,
                        'x_pos' => isset($nodeData['x_pos']) ? (float) $nodeData['x_pos'] : 0,
                        'y_pos' => isset($nodeData['y_pos']) ? (float) $nodeData['y_pos'] : 0,
                        'icon_type' => $nodeData['icon_type'] ?? 'server',
                        'shape' => $nodeData['shape'] ?? 'rounded_rect',
                        'color' => $nodeData['color'] ?? null,
                        'width' => isset($nodeData['width']) ? (int) $nodeData['width'] : 170,
                        'height' => isset($nodeData['height']) ? (int) $nodeData['height'] : 0,
                        'submap_id' => $submapId,
                    ]);

                    $savedNodeIds[$nodeId] = true;
                }

                // Process links
                if ($request->has('links')) {
                    foreach ($request->input('links', []) as $linkData) {
                        $rawSource = $linkData['source_node_id'] ?? null;
                        $rawTarget = $linkData['target_node_id'] ?? null;

                        $resolvedSource = $nodeIdMap[$rawSource] ?? $rawSource;
                        $resolvedTarget = $nodeIdMap[$rawTarget] ?? $rawTarget;

                        // Ensure both source and target nodes exist in the current map
                        if (!isset($savedNodeIds[$resolvedSource]) || !isset($savedNodeIds[$resolvedTarget])) {
                            continue;
                        }

                        $rawLinkId = $linkData['id'] ?? null;
                        $linkId = ($rawLinkId && Str::isUuid($rawLinkId)) ? $rawLinkId : (string) Str::uuid();

                        $linkMonitorId = isset($linkData['monitor_id']) && isset($validMonitorIds[$linkData['monitor_id']])
                            ? (int) $linkData['monitor_id']
                            : null;

                        NetworkMapLink::create([
                            'id' => $linkId,
                            'network_map_id' => $map->id,
                            'source_node_id' => $resolvedSource,
                            'target_node_id' => $resolvedTarget,
                            'snmp_interface_id' => $linkData['snmp_interface_id'] ?? null,
                            'show_traffic' => (bool) ($linkData['show_traffic'] ?? false),
                            'monitor_id' => $linkMonitorId,
                            'label' => $linkData['label'] ?? null,
                            'interface_name' => $linkData['interface_name'] ?? null,
                            'color' => $linkData['color'] ?? '#94a3b8',
                            'style' => $linkData['style'] ?? 'solid',
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'map' => $map->fresh(['nodes.monitor', 'links.monitor']),
                'message' => 'Network map updated successfully.'
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('NetworkMap update error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['message' => 'Failed to update map topology.'], 500);
        }
    }

    /**
     * Remove the specified network map.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $organization = $this->getOrganization($request);
        if (!$organization) {
            return response()->json(['message' => 'Unauthorized or missing organization context.'], 403);
        }

        $map = NetworkMap::where('organization_id', $organization->id)->find($id);
        if (!$map) {
            return response()->json(['message' => 'Network map not found.'], 404);
        }

        try {
            DB::transaction(function () use ($map) {
                $map->links()->delete();
                $map->nodes()->delete();
                $map->delete();
            });

            return response()->json(['message' => 'Network map deleted successfully.']);
        } catch (\Throwable $e) {
            Log::error('NetworkMap destroy error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete network map.'], 500);
        }
    }
}
