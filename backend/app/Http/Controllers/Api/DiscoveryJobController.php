<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiscoveryJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DiscoveryJobController extends Controller
{
    private function checkAccess($orgId)
    {
        $org = \App\Models\Organization::find($orgId);
        if ($org) {
            $features = $org->effective_features;
            if (!in_array('network-discovery', $features['allowed_tools'])) {
                abort(403, "Network discovery is not included in your current plan. Please upgrade.");
            }
        }
    }

    public function index(Request $request)
    {
        $orgId = $request->attributes->get('org_id');
        $this->checkAccess($orgId);
        $jobs = DiscoveryJob::where('organization_id', $orgId)->orderBy('id', 'desc')->get();
        
        return response()->json($jobs);
    }

    public function store(Request $request)
    {
        $orgId = $request->attributes->get('org_id');
        $this->checkAccess($orgId);
        
        $validated = $request->validate([
            'seed_ip' => 'required|string',
            'snmp_version' => 'required|string',
            'community' => 'nullable|string',
            'user' => 'nullable|string',
            'auth_pass' => 'nullable|string',
            'priv_pass' => 'nullable|string',
            'interval_minutes' => 'nullable|integer|min:1',
        ]);
        
        $job = DiscoveryJob::create([
            'organization_id' => $orgId,
            'seed_ip' => $validated['seed_ip'],
            'snmp_version' => $validated['snmp_version'],
            'community' => $validated['community'] ?? null,
            'user' => $validated['user'] ?? null,
            'auth_pass' => $validated['auth_pass'] ?? null,
            'priv_pass' => $validated['priv_pass'] ?? null,
            'interval_minutes' => $validated['interval_minutes'] ?? 15,
            'is_active' => true,
        ]);
        
        return response()->json($job, 201);
    }
    
    public function destroy(Request $request, $id)
    {
        $orgId = $request->attributes->get('org_id');
        $job = DiscoveryJob::where('organization_id', $orgId)->findOrFail($id);
        
        $job->delete();
        
        return response()->json(['message' => 'Job deleted']);
    }
    
    public function toggle(Request $request, $id)
    {
        $orgId = $request->attributes->get('org_id');
        $job = DiscoveryJob::where('organization_id', $orgId)->findOrFail($id);
        
        $job->is_active = !$job->is_active;
        $job->save();
        
        return response()->json($job);
    }
}
