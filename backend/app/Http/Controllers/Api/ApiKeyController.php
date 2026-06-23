<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ApiKeyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');

        return response()->json($org->apiKeys()->get()); // key_hash is $hidden, never returned
    }

    public function store(Request $request): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($request->user()->isOrgAdmin(), 403, 'Only Org Admins can generate API keys.');

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['in:monitors:read,monitors:write,incidents:read,incidents:write,status_pages:read,reports:read'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        [$key, $plaintext] = ApiKey::generate($org, $request->name, $request->input('scopes', []), $request->user());

        AuditLog::record('api_key.created', $key, ['name' => $key->name]);

        // The plaintext key is returned exactly once — it is never retrievable again.
        return response()->json(['api_key' => $key, 'plaintext_key' => $plaintext], 201);
    }

    public function destroy(Request $request, ApiKey $apiKey): JsonResponse
    {
        $org = $request->attributes->get('organization');
        abort_unless($apiKey->organization_id === $org->id, 403);
        abort_unless($request->user()->isOrgAdmin(), 403);

        $apiKey->update(['is_active' => false]);
        AuditLog::record('api_key.revoked', $apiKey);

        return response()->json(['message' => 'API key revoked.']);
    }
}
