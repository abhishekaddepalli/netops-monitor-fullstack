<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NetworkMap;
use App\Models\NetworkMapNode;
use App\Models\NetworkMapLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class NetworkMapController extends Controller
{
    public function index(Request $request)
    {
        $organization = $request->attributes->get('organization');
        $maps = NetworkMap::where('organization_id', $organization->id)->latest()->get();
        return response()->json(['maps' => $maps]);
    }

    public function show(Request $request, $id)
    {
        $organization = $request->attributes->get('organization');
        $map = NetworkMap::where('organization_id', $organization->id)
            ->with(['nodes.monitor', 'links.monitor'])
            ->findOrFail($id);

        return response()->json(['map' => $map]);
    }

    public function store(Request $request)
    {
        $organization = $request->attributes->get('organization');

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $map = NetworkMap::create([
            'organization_id' => $organization->id,
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json(['map' => $map, 'message' => 'Network map created successfully.']);
    }

    public function update(Request $request, $id)
    {
        $organization = $request->attributes->get('organization');
        $map = NetworkMap::where('organization_id', $organization->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'nodes' => 'sometimes|array',
            'links' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            if ($request->has('name')) {
                $map->update([
                    'name' => $request->name,
                    'description' => $request->description ?? $map->description,
                ]);
            }

            if ($request->has('nodes')) {
                // Delete existing nodes and links
                $map->nodes()->delete(); // Cascades links in DB usually, but let's clear links explicitly
                $map->links()->delete();

                // Recreate nodes
                // To maintain link references, we expect nodes to provide a temporary "id" mapping or client generated UUIDs
                foreach ($request->nodes as $nodeData) {
                    NetworkMapNode::create([
                        'id' => $nodeData['id'] ?? (string) Str::uuid(),
                        'network_map_id' => $map->id,
                        'monitor_id' => $nodeData['monitor_id'] ?? null,
                        'label' => $nodeData['label'] ?? null,
                        'x_pos' => $nodeData['x_pos'] ?? 0,
                        'y_pos' => $nodeData['y_pos'] ?? 0,
                        'icon_type' => $nodeData['icon_type'] ?? 'server',
                    ]);
                }

                if ($request->has('links')) {
                    foreach ($request->links as $linkData) {
                        NetworkMapLink::create([
                            'id' => $linkData['id'] ?? (string) Str::uuid(),
                            'network_map_id' => $map->id,
                            'source_node_id' => $linkData['source_node_id'],
                            'target_node_id' => $linkData['target_node_id'],
                            'monitor_id' => $linkData['monitor_id'] ?? null,
                            'label' => $linkData['label'] ?? null,
                            'interface_name' => $linkData['interface_name'] ?? null,
                            'color' => $linkData['color'] ?? '#94a3b8',
                            'style' => $linkData['style'] ?? 'solid',
                        ]);
                    }
                }
            }

            DB::commit();
            return response()->json(['message' => 'Network map updated successfully.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update map topology: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $organization = $request->attributes->get('organization');
        $map = NetworkMap::where('organization_id', $organization->id)->findOrFail($id);
        $map->delete();

        return response()->json(['message' => 'Network map deleted successfully.']);
    }
}
