<?php

namespace App\Services\Auth;

use App\Models\Organization;
use App\Models\Plan;
use App\Models\User;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GoogleOAuthService
{
    public static function getSettings(): array
    {
        if (Storage::exists('global_settings.json')) {
            return json_decode(Storage::get('global_settings.json'), true) ?? [];
        }
        return [];
    }

    public static function isEnabled(): bool
    {
        $settings = self::getSettings();
        return !empty($settings['google_oauth_enabled']) && !empty($settings['google_client_id']);
    }

    public static function getRedirectUri(): string
    {
        $settings = self::getSettings();
        if (!empty($settings['google_redirect_uri'])) {
            return $settings['google_redirect_uri'];
        }
        return url('/api/v1/auth/google/callback');
    }

    public static function getAuthUrl(): string
    {
        $settings = self::getSettings();
        $clientId = $settings['google_client_id'] ?? '';
        $redirectUri = self::getRedirectUri();

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'access_type' => 'online',
            'prompt' => 'select_account',
            'state' => bin2hex(random_bytes(16)),
        ];

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    }

    public static function handleCallback(string $code): array
    {
        $settings = self::getSettings();
        $clientId = $settings['google_client_id'] ?? '';
        $clientSecret = $settings['google_client_secret'] ?? '';
        $redirectUri = self::getRedirectUri();

        if (empty($clientId) || empty($clientSecret)) {
            throw new \RuntimeException('Google OAuth credentials are not properly configured.');
        }

        $client = new Client(['timeout' => 10]);

        // 1. Exchange authorization code for access token
        $tokenResponse = $client->post('https://oauth2.googleapis.com/token', [
            'form_params' => [
                'code' => $code,
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ],
            'http_errors' => false,
        ]);

        if ($tokenResponse->getStatusCode() !== 200) {
            $errBody = json_decode((string) $tokenResponse->getBody(), true);
            $errDescription = $errBody['error_description'] ?? ($errBody['error'] ?? 'Google token exchange failed.');
            throw new \RuntimeException('Google Authentication Error: ' . $errDescription);
        }

        $tokenData = json_decode((string) $tokenResponse->getBody(), true);
        $accessToken = $tokenData['access_token'] ?? null;

        if (!$accessToken) {
            throw new \RuntimeException('No access token returned by Google.');
        }

        // 2. Fetch User Profile
        $userResponse = $client->get('https://www.googleapis.com/oauth2/v3/userinfo', [
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Accept' => 'application/json',
            ],
            'http_errors' => false,
        ]);

        if ($userResponse->getStatusCode() !== 200) {
            throw new \RuntimeException('Failed to fetch user profile from Google.');
        }

        $googleUser = json_decode((string) $userResponse->getBody(), true);
        $googleId = $googleUser['sub'] ?? null;
        $email = $googleUser['email'] ?? null;
        $name = $googleUser['name'] ?? ($googleUser['given_name'] ?? 'Google User');
        $avatar = $googleUser['picture'] ?? null;

        if (!$email) {
            throw new \RuntimeException('Google account did not return a valid email address.');
        }

        // 3. Find existing user by google_id or email
        $user = User::where('google_id', $googleId)->orWhere('email', $email)->first();

        if ($user) {
            if (!$user->is_active) {
                throw new \RuntimeException('Your account has been deactivated.');
            }
            if ($user->organization && ($user->organization->is_suspended || !$user->organization->is_active)) {
                throw new \RuntimeException('Your organization account is suspended.');
            }

            // Update google_id and avatar if missing
            $updates = ['last_login_at' => now(), 'last_login_ip' => request()->ip()];
            if (!$user->google_id && $googleId) {
                $updates['google_id'] = $googleId;
            }
            if (!$user->avatar_path && $avatar) {
                $updates['avatar_path'] = $avatar;
            }
            $user->update($updates);
        } else {
            // New user registration
            $freePlan = Plan::where('key', 'free')->first();
            $orgName = $name . "'s Workspace";

            $organization = Organization::create([
                'name' => $orgName,
                'plan' => 'free',
                'monitor_limit' => $freePlan->monitor_limit ?? 10,
                'team_member_limit' => $freePlan->team_member_limit ?? 2,
                'trial_ends_at' => now()->addDays(14),
            ]);

            $user = User::create([
                'organization_id' => $organization->id,
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId,
                'avatar_path' => $avatar,
                'password' => Hash::make(Str::random(32)),
                'system_role' => 'standard',
                'email_verified_at' => now(),
                'last_login_at' => now(),
                'last_login_ip' => request()->ip(),
            ]);

            $organization->users()->attach($user->id, [
                'role' => 'org_admin',
                'joined_at' => now(),
            ]);
        }

        // If 2FA is enabled on this account, challenge is required
        if ($user->two_factor_enabled) {
            $twoFactorToken = Str::random(64);
            cache()->put('2fa_challenge_' . $twoFactorToken, $user->id, now()->addMinutes(5));

            return [
                'two_factor_required' => true,
                'two_factor_token' => $twoFactorToken,
                'user' => $user,
            ];
        }

        // Create Sanctum Token
        $token = $user->createToken('google-social-login')->plainTextToken;

        return [
            'two_factor_required' => false,
            'token' => $token,
            'user' => $user->load('organization'),
        ];
    }
}
