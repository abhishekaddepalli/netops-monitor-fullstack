<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Monitor;
use App\Models\Plan;
use App\Jobs\RunMonitorCheckJob;
use App\Services\Monitors\MonitorCheckerFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MonitorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        $query = Monitor::query()->where('organization_id', $org->id);

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('target', 'like', "%{$search}%"));
        }
        if ($teamId = $request->query('team_id')) {
            $query->where('team_id', $teamId);
        }

        $monitors = $query->orderBy('sort_order')->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        // Calculate live uptime percentage for the returned monitors
        if ($monitors->isNotEmpty()) {
            $monitorIds = $monitors->pluck('id');
            $uptimeStats = \Illuminate\Support\Facades\DB::table('checks')
                ->whereIn('monitor_id', $monitorIds)
                ->where('checked_at', '>=', now()->subDay())
                ->selectRaw('monitor_id, COUNT(*) as total_checks, SUM(CASE WHEN result = \'up\' THEN 1 ELSE 0 END) as up_checks')
                ->groupBy('monitor_id')
                ->get()
                ->keyBy('monitor_id');

            $monitors->getCollection()->transform(function ($monitor) use ($uptimeStats) {
                $stats = $uptimeStats->get($monitor->id);
                $monitor->uptime_pct = ($stats && $stats->total_checks > 0)
                    ? round(($stats->up_checks / $stats->total_checks) * 100, 2)
                    : null;
                return $monitor;
            });
        }

        return response()->json($monitors);
    }

    public function show(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);

        $monitor->load([
            'sslCertificate', 
            'activeIncident', 
            'serverMetrics' => fn($q) => $q->latest('created_at')->limit(1)
        ]);
        
        return response()->json($monitor);
    }

    public function store(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        if (! $org->canAddMonitor()) {
            return response()->json([
                'message' => "Monitor limit reached for your plan ({$org->monitor_limit}). Upgrade to add more monitors.",
            ], 422);
        }

        $target = $request->input('target');
        if ($request->input('type') === 'http' && $target && !str_starts_with($target, 'http://') && !str_starts_with($target, 'https://')) {
            $request->merge(['target' => 'https://' . $target]);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:'.implode(',', MonitorCheckerFactory::supportedTypes())],
            'target' => ['required', 'string', 'max:2048'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'config' => ['nullable', 'array'],
            'check_interval_seconds' => ['required', 'integer', 'in:'.implode(',', config('monitoring.intervals'))],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:120'],
            'team_id' => ['nullable', 'exists:teams,id'],
            'escalation_policy_id' => ['nullable', 'exists:escalation_policies,id'],
            'tags' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Plan-based interval floor — e.g. Free plan can't use 30s checks.
        $plan = Plan::where('key', $org->plan)->first();
        if ($plan && $request->integer('check_interval_seconds') < $plan->check_interval_min_seconds) {
            return response()->json([
                'message' => "Your plan's fastest allowed check interval is {$plan->check_interval_min_seconds} seconds. Upgrade for faster checks.",
            ], 422);
        }

        $monitor = Monitor::create([
            ...$validator->validated(),
            'organization_id' => $org->id,
            'created_by' => $request->user()->id,
            'timeout_seconds' => $request->input('timeout_seconds', config('monitoring.default_timeout_seconds')),
            'confirmation_failures' => config('monitoring.failures_before_incident'),
            'confirmation_successes' => config('monitoring.successes_before_resolve'),
            'status' => 'pending',
            'next_check_at' => now(),
        ]);

        AuditLog::record('monitor.created', $monitor, ['name' => $monitor->name, 'type' => $monitor->type], $org);

        // Dispatch a check immediately so it doesn't stay 'pending' until the next cron minute
        RunMonitorCheckJob::dispatch($monitor->id)->onQueue(config('monitoring.queue_fast', 'monitor-checks-fast'));

        return response()->json($monitor, 201);
    }

    public function update(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);

        $target = $request->input('target');
        if ($monitor->type === 'http' && $target && !str_starts_with($target, 'http://') && !str_starts_with($target, 'https://')) {
            $request->merge(['target' => 'https://' . $target]);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'target' => ['sometimes', 'string', 'max:2048'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'config' => ['nullable', 'array'],
            'check_interval_seconds' => ['sometimes', 'integer', 'in:'.implode(',', config('monitoring.intervals'))],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:120'],
            'team_id' => ['nullable', 'exists:teams,id'],
            'escalation_policy_id' => ['nullable', 'exists:escalation_policies,id'],
            'tags' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $before = $monitor->only(array_keys($validator->validated()));
        $monitor->update($validator->validated());

        AuditLog::record('monitor.updated', $monitor, ['before' => $before, 'after' => $validator->validated()]);

        return response()->json($monitor);
    }

    public function destroy(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor, requireAdmin: true);

        AuditLog::record('monitor.deleted', $monitor, ['name' => $monitor->name]);
        $monitor->delete();

        return response()->json(['message' => 'Monitor deleted.']);
    }

    public function pause(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);
        $monitor->update(['is_paused' => true, 'status' => 'paused']);
        AuditLog::record('monitor.paused', $monitor);

        return response()->json($monitor);
    }

    public function resume(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);
        $monitor->update(['is_paused' => false, 'status' => 'pending', 'next_check_at' => now()]);
        AuditLog::record('monitor.resumed', $monitor);

        return response()->json($monitor);
    }

    /** Runs an immediate, synchronous check — used by the "Test Monitor" button in the UI. */
    public function test(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);

        $checker = MonitorCheckerFactory::make($monitor);
        $result = $checker->check($monitor);

        return response()->json([
            'result' => $result->result,
            'response_time_ms' => $result->responseTimeMs,
            'status_code' => $result->statusCode,
            'error_message' => $result->errorMessage,
            'details' => $result->details,
        ]);
    }

    public function checks(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);

        $checks = $monitor->checks()
            ->when($request->query('from'), fn ($q, $from) => $q->where('checked_at', '>=', $from))
            ->when($request->query('to'), fn ($q, $to) => $q->where('checked_at', '<=', $to))
            ->orderByDesc('checked_at')
            ->paginate($request->integer('per_page', 100));

        return response()->json($checks);
    }

    public function chartData(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorizeOrgAccess($request, $monitor);

        $range = $request->query('range', '24h');
        
        if ($range === '24h') {
            $data = $monitor->hourlyRollups()
                ->where('hour_bucket', '>=', now()->subHours(24))
                ->orderBy('hour_bucket')
                ->get()
                ->map(fn ($r) => [
                    'checked_at' => $r->hour_bucket,
                    'response_time_ms' => $r->avg_response_time_ms
                ]);
        } elseif ($range === '3d') {
            $data = $monitor->hourlyRollups()
                ->where('hour_bucket', '>=', now()->subDays(3))
                ->orderBy('hour_bucket')
                ->get()
                ->map(fn ($r) => [
                    'checked_at' => $r->hour_bucket,
                    'response_time_ms' => $r->avg_response_time_ms
                ]);
        } elseif ($range === '7d') {
            $data = $monitor->hourlyRollups()
                ->where('hour_bucket', '>=', now()->subDays(7))
                ->orderBy('hour_bucket')
                ->get()
                ->map(fn ($r) => [
                    'checked_at' => $r->hour_bucket,
                    'response_time_ms' => $r->avg_response_time_ms
                ]);
        } elseif ($range === '30d' || $range === '1m') {
            $data = $monitor->dailyRollups()
                ->where('day_bucket', '>=', now()->subDays(30))
                ->orderBy('day_bucket')
                ->get()
                ->map(fn ($r) => [
                    'checked_at' => $r->day_bucket,
                    'response_time_ms' => $r->avg_response_time_ms
                ]);
        } else {
            $data = [];
        }

        return response()->json(['data' => $data]);
    }

    private function authorizeOrgAccess(Request $request, Monitor $monitor, bool $requireAdmin = false): void
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return;
        }
        abort_unless($monitor->organization_id === $user->organization_id, 403, 'Monitor does not belong to your organization.');
        if ($requireAdmin) {
            abort_unless($user->isOrgAdmin(), 403, 'Only Org Admins can perform this action.');
        }
    }

    public function export(Request $request)
    {
        $org = $request->attributes->get('organization');
        $monitors = Monitor::where('organization_id', $org->id)->get();
        $csv = "ID,Name,Type,Target,Port,Interval Seconds,Timeout Seconds,Status,Created At\n";
        foreach ($monitors as $m) {
            $csv .= "{$m->id},\"{$m->name}\",{$m->type},{$m->target},{$m->port},{$m->check_interval_seconds},{$m->timeout_seconds},{$m->status},{$m->created_at}\n";
        }
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="monitors.csv"');
    }

    public function importTemplate(Request $request)
    {
        $csv = "Name,Type,Target,Port,Interval Seconds\n";
        $csv .= "Production API,http,https://api.myapp.com,,60\n";
        $csv .= "Database Server,tcp,192.168.1.100,5432,60\n";
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="monitors_import_template.csv"');
    }

    public function import(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');
        if (! $org->canAddMonitor()) {
            return response()->json(['message' => "Monitor limit reached."], 422);
        }

        $request->validate(['file' => 'required|file|mimes:csv,txt']);
        $path = $request->file('file')->getRealPath();
        $data = array_map('str_getcsv', file($path));
        $header = array_shift($data);

        $imported = 0;
        foreach ($data as $row) {
            if (count($row) < 3) continue;
            if (! $org->canAddMonitor()) break;

            $type = trim($row[1]) ?: 'http';
            $target = trim($row[2]);
            if ($type === 'http' && $target && !str_starts_with($target, 'http://') && !str_starts_with($target, 'https://')) {
                $target = 'https://' . $target;
            }

            try {
                $monitor = Monitor::create([
                    'organization_id' => $org->id,
                    'created_by' => $request->user()->id,
                    'name' => trim($row[0]),
                    'type' => $type,
                    'target' => $target,
                    'port' => isset($row[3]) ? ((int) trim($row[3]) ?: null) : null,
                    'check_interval_seconds' => isset($row[4]) ? ((int) trim($row[4]) ?: 60) : 60,
                    'timeout_seconds' => config('monitoring.default_timeout_seconds'),
                    'confirmation_failures' => config('monitoring.failures_before_incident'),
                    'confirmation_successes' => config('monitoring.successes_before_resolve'),
                    'status' => 'pending',
                    'next_check_at' => now(),
                ]);
                AuditLog::record('monitor.created', $monitor, ['name' => $monitor->name, 'type' => $monitor->type], $org);
                RunMonitorCheckJob::dispatch($monitor->id)->onQueue(config('monitoring.queue_fast', 'monitor-checks-fast'));
                $imported++;
            } catch (\Exception $e) {
                // skip invalid row
            }
        }
        return response()->json(['message' => "Successfully imported {$imported} monitors"]);
    }
}
