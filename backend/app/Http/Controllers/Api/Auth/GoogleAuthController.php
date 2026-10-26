<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\GoogleOAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GoogleAuthController extends Controller
{
    /**
     * Check if Google OAuth is enabled and return auth URL.
     */
    public function url(): JsonResponse
    {
        $enabled = GoogleOAuthService::isEnabled();
        if (!$enabled) {
            return response()->json([
                'enabled' => false,
                'url' => null,
            ]);
        }

        return response()->json([
            'enabled' => true,
            'url' => GoogleOAuthService::getAuthUrl(),
        ]);
    }

    /**
     * Redirect directly to Google OAuth consent screen.
     */
    public function redirect(): RedirectResponse|JsonResponse
    {
        if (!GoogleOAuthService::isEnabled()) {
            return redirect('/login?error=' . urlencode('Google login is not configured or enabled by administrator.'));
        }

        return redirect()->away(GoogleOAuthService::getAuthUrl());
    }

    /**
     * Handle callback from Google OAuth.
     */
    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            $error = $request->input('error_description', $request->input('error', 'Google sign-in was canceled.'));
            return redirect('/login?error=' . urlencode($error));
        }

        $code = $request->input('code');
        if (empty($code)) {
            return redirect('/login?error=' . urlencode('No authorization code received from Google.'));
        }

        try {
            $result = GoogleOAuthService::handleCallback($code);

            if (!empty($result['two_factor_required'])) {
                // User has 2FA enabled, redirect to login with 2fa challenge token
                return redirect('/login?2fa=1&token=' . urlencode($result['two_factor_token']));
            }

            // Successfully authenticated, redirect to frontend auth callback with token
            $token = $result['token'];
            return redirect('/auth/callback?token=' . urlencode($token));
        } catch (\Throwable $e) {
            return redirect('/login?error=' . urlencode($e->getMessage()));
        }
    }
}
