<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with(['user:id,name,email', 'organization:id,name']);

        if ($orgId = $request->query('organization_id')) {
            $query->where('organization_id', $orgId);
        }

        if ($action = $request->query('action')) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($search = $request->query('search')) {
            $query->where(fn($q) => $q->whereHas('user', fn($u) => $u->where('email', 'like', "%{$search}%")
                                                                     ->orWhere('name', 'like', "%{$search}%"))
                                      ->orWhereHas('organization', fn($o) => $o->where('name', 'like', "%{$search}%")));
        }

        $logs = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 50));

        return response()->json($logs);
    }

    public function destroy(Request $request): JsonResponse
    {
        $days = $request->input('older_than_days');
        if ($days) {
            $date = now()->subDays($days);
            $count = AuditLog::where('created_at', '<', $date)->delete();
        } else {
            $count = AuditLog::query()->delete();
        }
        return response()->json(['message' => "$count logs deleted successfully"]);
    }

    public function export(Request $request)
    {
        $query = AuditLog::with(['user:id,name,email', 'organization:id,name']);

        if ($orgId = $request->query('organization_id')) {
            $query->where('organization_id', $orgId);
        }

        if ($action = $request->query('action')) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($search = $request->query('search')) {
            $query->where(fn($q) => $q->whereHas('user', fn($u) => $u->where('email', 'like', "%{$search}%")
                                                                     ->orWhere('name', 'like', "%{$search}%"))
                                      ->orWhereHas('organization', fn($o) => $o->where('name', 'like', "%{$search}%")));
        }

        $logs = $query->orderByDesc('created_at')->get();

        $headers = [
            'Content-type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="audit_logs.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];

        $callback = function() use ($logs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Organization', 'User', 'Action', 'IP Address', 'Created At']);
            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->organization ? $log->organization->name : 'System',
                    $log->user ? $log->user->email : 'System',
                    $log->action,
                    $log->ip_address,
                    $log->created_at
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
