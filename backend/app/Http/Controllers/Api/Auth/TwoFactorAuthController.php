<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\TotpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TwoFactorAuthController extends Controller
{
    /**
     * Start 2FA setup: generates secret, recovery codes and QR code URL.
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = TotpService::generateSecret(16);
        $recoveryCodes = TotpService::generateRecoveryCodes(8);

        // Get app name for authenticator label
        $appName = 'NetOps Monitor';
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
            $appName = $settings['app_name'] ?? $appName;
        }

        $otpauthUrl = TotpService::getOtpAuthUrl($appName, $user->email, $secret);
        $qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=' . rawurlencode($otpauthUrl);

        // Store pending 2FA data in cache for 15 minutes
        cache()->put('2fa_pending_' . $user->id, [
            'secret' => $secret,
            'recovery_codes' => $recoveryCodes,
        ], now()->addMinutes(15));

        // Format secret in readable 4-character chunks (e.g., ABCD EFGH 1234 5678)
        $formattedSecret = chunk_split($secret, 4, ' ');

        return response()->json([
            'secret' => $secret,
            'formatted_secret' => trim($formattedSecret),
            'otpauth_url' => $otpauthUrl,
            'qr_url' => $qrUrl,
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Verify code and enable 2FA for authenticated user.
     */
    public function enable(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|min:6|max:8',
        ]);

        $user = $request->user();
        $pending = cache()->get('2fa_pending_' . $user->id);

        if (!$pending || empty($pending['secret'])) {
            return response()->json([
                'message' => '2FA setup session expired. Please start the setup process again.',
            ], 400);
        }

        $cleanCode = preg_replace('/\s+/', '', $request->code);

        if (!TotpService::verifyCode($pending['secret'], $cleanCode)) {
            return response()->json([
                'message' => 'Invalid verification code. Please make sure the code matches your authenticator app.',
            ], 422);
        }

        // Commit 2FA
        $user->two_factor_secret = encrypt($pending['secret']);
        $user->two_factor_recovery_codes = json_encode($pending['recovery_codes']);
        $user->two_factor_enabled = true;
        $user->save();

        cache()->forget('2fa_pending_' . $user->id);

        return response()->json([
            'message' => 'Two-factor authentication has been successfully enabled on your account.',
            'two_factor_enabled' => true,
            'user' => $user->fresh()->load('organization'),
            'recovery_codes' => $pending['recovery_codes'],
        ]);
    }

    /**
     * Disable 2FA for authenticated user.
     */
    public function disable(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'nullable|string',
            'code' => 'nullable|string',
        ]);

        $user = $request->user();

        $verified = false;

        // Check password if provided
        if ($request->filled('password')) {
            if (Hash::check($request->password, $user->password)) {
                $verified = true;
            }
        }

        // Check 2FA code if provided
        if (!$verified && $request->filled('code') && $user->two_factor_secret) {
            try {
                $secret = decrypt($user->two_factor_secret);
                $cleanCode = preg_replace('/\s+/', '', $request->code);
                if (TotpService::verifyCode($secret, $cleanCode)) {
                    $verified = true;
                }
            } catch (\Exception $e) {}
        }

        if (!$verified) {
            return response()->json([
                'message' => 'Please provide your correct account password or a valid 2FA code to disable two-factor authentication.',
            ], 422);
        }

        $user->two_factor_enabled = false;
        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->save();

        return response()->json([
            'message' => 'Two-factor authentication has been disabled.',
            'two_factor_enabled' => false,
            'user' => $user->fresh()->load('organization'),
        ]);
    }

    /**
     * Retrieve or regenerate recovery codes.
     */
    public function recoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is not enabled.',
            ], 400);
        }

        if ($request->boolean('regenerate')) {
            $newCodes = TotpService::generateRecoveryCodes(8);
            $user->two_factor_recovery_codes = json_encode($newCodes);
            $user->save();

            return response()->json([
                'message' => 'New recovery codes generated.',
                'recovery_codes' => $newCodes,
            ]);
        }

        $codes = [];
        if ($user->two_factor_recovery_codes) {
            $codes = json_decode($user->two_factor_recovery_codes, true) ?? [];
        }

        return response()->json([
            'recovery_codes' => $codes,
        ]);
    }

    /**
     * Public endpoint: verify 2FA challenge code during login.
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'two_factor_token' => 'required|string',
            'code' => 'required|string',
        ]);

        $userId = cache()->get('2fa_challenge_' . $request->two_factor_token);

        if (!$userId) {
            return response()->json([
                'message' => 'The two-factor authentication challenge has expired. Please log in again.',
            ], 401);
        }

        $user = User::find($userId);

        if (!$user || !$user->two_factor_enabled || empty($user->two_factor_secret)) {
            return response()->json([
                'message' => 'User not found or 2FA is not configured.',
            ], 400);
        }

        $code = trim($request->code);
        $cleanCode = preg_replace('/\s+/', '', $code);
        $verified = false;

        // 1. Try TOTP Code verification
        try {
            $secret = decrypt($user->two_factor_secret);
            if (TotpService::verifyCode($secret, $cleanCode)) {
                $verified = true;
            }
        } catch (\Exception $e) {}

        // 2. Try Recovery Code verification if TOTP failed
        if (!$verified && !empty($user->two_factor_recovery_codes)) {
            $recoveryCodes = json_decode($user->two_factor_recovery_codes, true) ?? [];
            $normalizedInput = strtolower(str_replace([' ', '-'], '', $code));

            foreach ($recoveryCodes as $index => $rc) {
                $normalizedRc = strtolower(str_replace([' ', '-'], '', $rc));
                if (hash_equals($normalizedRc, $normalizedInput)) {
                    $verified = true;
                    // Consume the used recovery code
                    unset($recoveryCodes[$index]);
                    $user->two_factor_recovery_codes = json_encode(array_values($recoveryCodes));
                    $user->save();
                    break;
                }
            }
        }

        if (!$verified) {
            return response()->json([
                'message' => 'Invalid authenticator code or recovery code. Please try again.',
            ], 422);
        }

        // Successfully verified: clear challenge token
        cache()->forget('2fa_challenge_' . $request->two_factor_token);

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $token = $user->createToken($request->userAgent() ?? 'web-2fa')->plainTextToken;

        return response()->json([
            'user' => $user->load('organization'),
            'token' => $token,
        ]);
    }
}
