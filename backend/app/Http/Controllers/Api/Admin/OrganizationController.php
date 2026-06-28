<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/** All routes here are gated by 'org.role:super_admin' middleware in routes/api.php. */
class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Organization::query()
            ->with(['users' => function ($q) {
                $q->wherePivot('role', 'org_admin');
            }])
            ->withCount('monitors', 'users');

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }
        if ($plan = $request->query('plan')) {
            $query->where('plan', $plan);
        }

        return response()->json($query->orderByDesc('created_at')->paginate($request->integer('per_page', 25)));
    }
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'plan' => ['required', 'string', 'exists:plans,key'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:20'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'unique:users,email'],
            'admin_password' => ['required', \Illuminate\Validation\Rules\Password::min(8)],
            'admin_phone' => ['nullable', 'string', 'max:20'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $planModel = \App\Models\Plan::where('key', $request->plan)->first();

        $organization = Organization::create([
            'name' => $request->name,
            'plan' => $request->plan,
            'monitor_limit' => $planModel ? $planModel->monitor_limit : 50,
            'team_member_limit' => $planModel ? $planModel->team_member_limit : 10,
            'default_monitoring_node_id' => $request->default_monitoring_node_id,
            'address' => $request->address,
            'phone' => $request->phone,
        ]);

        $user = \App\Models\User::create([
            'organization_id' => $organization->id,
            'name' => $request->admin_name,
            'email' => $request->admin_email,
            'password' => \Illuminate\Support\Facades\Hash::make($request->admin_password),
            'phone' => $request->admin_phone,
            'system_role' => 'standard',
        ]);

        $organization->users()->attach($user->id, ['role' => 'org_admin', 'joined_at' => now()]);

        return response()->json($organization, 201);
    }

    public function update(Request $request, Organization $organization): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'plan' => ['sometimes', 'string', 'exists:plans,key'],
            'monitor_limit' => ['sometimes', 'integer', 'min:1'],
            'team_member_limit' => ['sometimes', 'integer', 'min:1'],
            'white_label_enabled' => ['sometimes', 'boolean'],
            'default_monitoring_node_id' => ['nullable', 'exists:monitoring_nodes,id'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:20'],
            'admin_name' => ['sometimes', 'string', 'max:255'],
            'admin_email' => ['sometimes', 'email'],
            'admin_password' => ['nullable', \Illuminate\Validation\Rules\Password::min(8)],
            'admin_phone' => ['nullable', 'string', 'max:20'],
            'alert_email_enabled' => ['sometimes', 'boolean'],
            'alert_sms_enabled' => ['sometimes', 'boolean'],
            'alert_webhook_enabled' => ['sometimes', 'boolean'],
            'alert_slack_enabled' => ['sometimes', 'boolean'],
            'alert_telegram_enabled' => ['sometimes', 'boolean'],
            'enable_login_alerts' => 'sometimes|boolean',
            'enable_weekly_reports' => 'sometimes|boolean',
            'enable_monthly_reports' => 'sometimes|boolean',
            'custom_features' => 'nullable|array',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $attributes = ['name', 'plan', 'monitor_limit', 'team_member_limit', 'white_label_enabled', 'default_monitoring_node_id', 'address', 'phone', 'alert_email_enabled', 'alert_sms_enabled', 'alert_webhook_enabled', 'alert_slack_enabled', 'alert_telegram_enabled'];
        $before = $organization->only($attributes);
        $organization->update($validator->safe()->only($attributes));

        if ($request->has('admin_email')) {
            $adminUser = $organization->users()->wherePivot('role', 'org_admin')->first();
            if ($adminUser) {
                if ($request->admin_email !== $adminUser->email && \App\Models\User::where('email', $request->admin_email)->where('id', '!=', $adminUser->id)->exists()) {
                    return response()->json(['errors' => ['admin_email' => ['Email already taken by another user.']]], 422);
                }
                
                $adminUser->name = $request->input('admin_name', $adminUser->name);
                $adminUser->email = $request->input('admin_email', $adminUser->email);
                $adminUser->phone = $request->input('admin_phone', $adminUser->phone);
                
                if ($request->filled('admin_password')) {
                    $adminUser->password = \Illuminate\Support\Facades\Hash::make($request->admin_password);
                }
                
                $adminUser->save();
            }
        }

        AuditLog::record('admin.organization_updated', $organization, ['before' => $before, 'after' => $validator->validated()]);

        return response()->json($organization);
    }

    public function suspend(Request $request, Organization $organization): JsonResponse
    {
        $validator = Validator::make($request->all(), ['reason' => ['required', 'string', 'max:1000']]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $organization->update([
            'is_suspended' => true,
            'suspension_reason' => $request->reason,
        ]);

        AuditLog::record('admin.organization_suspended', $organization, ['reason' => $request->reason]);

        return response()->json($organization);
    }

    public function unsuspend(Request $request, Organization $organization): JsonResponse
    {
        $organization->update(['is_suspended' => false, 'suspension_reason' => null]);
        AuditLog::record('admin.organization_unsuspended', $organization);

        return response()->json($organization);
    }

    public function expire(Request $request, Organization $organization): JsonResponse
    {
        $organization->update(['is_expired' => true]);
        AuditLog::record('admin.organization_expired', $organization);
        return response()->json($organization);
    }

    public function unexpire(Request $request, Organization $organization): JsonResponse
    {
        $organization->update(['is_expired' => false]);
        AuditLog::record('admin.organization_unexpired', $organization);
        return response()->json($organization);
    }

    public function destroy(Request $request, Organization $organization): JsonResponse
    {
        AuditLog::record('admin.organization_deleted', $organization);
        $organization->delete();
        return response()->json(['message' => 'Organization deleted']);
    }

    public function export(Request $request)
    {
        $orgs = Organization::withCount('monitors', 'users')->get();
        $csv = "ID,Name,Slug,Plan,Status,Monitors,Users,Created At\n";
        foreach ($orgs as $org) {
            $status = $org->is_expired ? 'Expired' : ($org->is_suspended ? 'Suspended' : 'Active');
            $csv .= "{$org->id},\"{$org->name}\",{$org->slug},{$org->plan},{$status},{$org->monitors_count},{$org->users_count},{$org->created_at}\n";
        }
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="organizations.csv"');
    }

    public function importTemplate(Request $request)
    {
        $csv = "Organization Name,Plan,Admin Name,Admin Email,Admin Password\n";
        $csv .= "Acme Corp,free,John Doe,john@acmecorp.com,securepass123\n";
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="organizations_import_template.csv"');
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt']);
        $path = $request->file('file')->getRealPath();
        $data = array_map('str_getcsv', file($path));
        $header = array_shift($data);

        $imported = 0;
        foreach ($data as $row) {
            if (count($row) < 5) continue;
            try {
                \Illuminate\Support\Facades\DB::beginTransaction();
                $org = Organization::create([
                    'name' => trim($row[0]),
                    'plan' => trim($row[1]) ?: 'free',
                    'monitor_limit' => 50,
                    'team_member_limit' => 10,
                ]);
                $user = \App\Models\User::create([
                    'organization_id' => $org->id,
                    'name' => trim($row[2]),
                    'email' => trim($row[3]),
                    'password' => \Illuminate\Support\Facades\Hash::make(trim($row[4])),
                    'system_role' => 'standard',
                ]);
                $org->users()->attach($user->id, ['role' => 'org_admin', 'joined_at' => now()]);
                \Illuminate\Support\Facades\DB::commit();
                $imported++;
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                // Skip rows that fail (e.g. duplicate email)
            }
        }
        return response()->json(['message' => "Successfully imported {$imported} organizations"]);
    }
}
