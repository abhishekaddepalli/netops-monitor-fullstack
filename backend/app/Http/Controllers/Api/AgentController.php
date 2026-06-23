<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCheckResultJob;
use App\Models\Check;
use App\Models\Monitor;
use App\Models\MonitoringNode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    private function authenticateNode(Request $request): ?MonitoringNode
    {
        $key = $request->query('key') ?? $request->input('key');
        if (!$key) return null;
        
        $node = MonitoringNode::where('key', $key)->first();
        if ($node) {
            $node->update(['last_heartbeat_at' => now(), 'is_active' => true]);
        }
        return $node;
    }

    public function getJobs(Request $request): JsonResponse
    {
        $node = $this->authenticateNode($request);
        if (!$node) {
            return response()->json(['error' => 'Invalid node key'], 401);
        }

        // Get monitors explicitly assigned to this node, OR monitors belonging to an org whose default node is this node.
        $monitors = Monitor::where('is_paused', false)
            ->where(function ($query) use ($node) {
                $query->whereHas('nodes', function ($q) use ($node) {
                    $q->where('monitoring_nodes.id', $node->id);
                })->orWhereHas('organization', function ($q) use ($node) {
                    $q->where('default_monitoring_node_id', $node->id);
                });
            })
            ->get(['id', 'type', 'target', 'port', 'config', 'check_interval_seconds', 'timeout_seconds']);

        return response()->json(['jobs' => $monitors]);
    }

    public function postResults(Request $request): JsonResponse
    {
        $node = $this->authenticateNode($request);
        if (!$node) {
            return response()->json(['error' => 'Invalid node key'], 401);
        }

        $results = $request->input('results', []);

        foreach ($results as $res) {
            if (!isset($res['monitor_id'], $res['result'])) {
                continue;
            }

            Check::create([
                'monitor_id' => $res['monitor_id'],
                'monitoring_node_id' => $node->id,
                'result' => $res['result'],
                'response_time_ms' => $res['response_time_ms'] ?? null,
                'status_code' => $res['status_code'] ?? null,
                'error_message' => $res['error_message'] ?? null,
                'details' => $res['details'] ?? null,
                'checked_at' => now(),
            ]);

            // Process the state machine
            ProcessCheckResultJob::dispatchSync(
                $res['monitor_id'],
                $res['result'],
                $res['error_message'] ?? null,
                $res['response_time_ms'] ?? null
            );
        }

        return response()->json(['status' => 'success', 'processed' => count($results)]);
    }
}
