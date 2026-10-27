<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
        }

        // Overlay with database GlobalSetting if available
        $dbSettings = GlobalSetting::pluck('value', 'key')->toArray();
        $settings = array_merge($settings, $dbSettings);

        $settings['default_google_redirect_uri'] = url('/api/v1/auth/google/callback');
        $settings['pwa_manifest_url'] = url('/manifest.webmanifest');

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
        }

        $data = $request->only([
            'stripe_key', 'stripe_secret', 'razorpay_key', 'razorpay_secret', 'upi_id', 'upi_qr_url', 'log_retention_days',
            'app_name', 'primary_color', 'custom_css', 'timezone', 'time_format',
            'company_name', 'company_address', 'company_gst', 'invoice_prefix',
            'google_oauth_enabled', 'google_client_id', 'google_client_secret', 'google_redirect_uri',
            'enforce_2fa',
            // PWA settings
            'pwa_name', 'pwa_short_name', 'pwa_description', 'pwa_theme_color', 'pwa_background_color',
            'pwa_display', 'pwa_orientation', 'pwa_install_prompt_enabled',
        ]);

        if ($request->hasFile('app_logo')) {
            $path = $request->file('app_logo')->store('whitelabel', 'public');
            $data['app_logo'] = asset('storage/' . $path);
        } elseif ($request->has('app_logo_url')) {
            $data['app_logo'] = $request->input('app_logo_url');
        }

        if ($request->hasFile('app_favicon')) {
            $path = $request->file('app_favicon')->store('whitelabel', 'public');
            $data['app_favicon'] = asset('storage/' . $path);
        } elseif ($request->has('app_favicon_url')) {
            $data['app_favicon'] = $request->input('app_favicon_url');
        }

        // Handle PWA icon uploads
        if ($request->hasFile('pwa_icon_192')) {
            $path = $request->file('pwa_icon_192')->store('pwa', 'public');
            $data['pwa_icon_192'] = asset('storage/' . $path);
        } elseif ($request->filled('pwa_icon_192_url')) {
            $data['pwa_icon_192'] = $request->input('pwa_icon_192_url');
        }

        if ($request->hasFile('pwa_icon_512')) {
            $path = $request->file('pwa_icon_512')->store('pwa', 'public');
            $data['pwa_icon_512'] = asset('storage/' . $path);
        } elseif ($request->filled('pwa_icon_512_url')) {
            $data['pwa_icon_512'] = $request->input('pwa_icon_512_url');
        }

        $settings = array_merge($settings, $data);

        // Store to JSON
        Storage::put('global_settings.json', json_encode($settings, JSON_PRETTY_PRINT));

        // Mirror to GlobalSetting table
        foreach ($data as $key => $val) {
            if ($val !== null) {
                GlobalSetting::updateOrCreate(['key' => $key], ['value' => (string) $val]);
            }
        }

        // Also update public/manifest.webmanifest so static web servers (Nginx/Apache) serve the latest manifest immediately
        try {
            $manifestData = $this->buildManifestData($settings);
            file_put_contents(public_path('manifest.webmanifest'), json_encode($manifestData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } catch (\Throwable) {
        }

        return response()->json($settings);
    }

    public function publicShow(): JsonResponse
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
        }

        $dbSettings = GlobalSetting::pluck('value', 'key')->toArray();
        $settings = array_merge($settings, $dbSettings);

        return response()->json([
            'app_name' => $settings['app_name'] ?? 'NetOps Monitor',
            'app_logo' => $settings['app_logo'] ?? null,
            'app_favicon' => $settings['app_favicon'] ?? null,
            'primary_color' => $settings['primary_color'] ?? '#2E4FA3',
            'custom_css' => $settings['custom_css'] ?? null,
            'timezone' => $settings['timezone'] ?? 'UTC',
            'time_format' => $settings['time_format'] ?? '24h',
            'upi_id' => $settings['upi_id'] ?? null,
            'upi_qr_url' => $settings['upi_qr_url'] ?? null,
            'google_oauth_enabled' => ! empty($settings['google_oauth_enabled']) && ! empty($settings['google_client_id']),
            'google_client_id' => ! empty($settings['google_oauth_enabled']) ? ($settings['google_client_id'] ?? null) : null,
            'enforce_2fa' => ! empty($settings['enforce_2fa']),
            // PWA public settings
            'pwa_name' => $settings['pwa_name'] ?? ($settings['app_name'] ?? 'NetOps Monitor'),
            'pwa_short_name' => $settings['pwa_short_name'] ?? 'NetOps',
            'pwa_description' => $settings['pwa_description'] ?? 'Network Operations & High Performance Uptime Monitoring',
            'pwa_theme_color' => $settings['pwa_theme_color'] ?? ($settings['primary_color'] ?? '#2E4FA3'),
            'pwa_background_color' => $settings['pwa_background_color'] ?? '#0F172A',
            'pwa_display' => $settings['pwa_display'] ?? 'standalone',
            'pwa_orientation' => $settings['pwa_orientation'] ?? 'any',
            'pwa_install_prompt_enabled' => ($settings['pwa_install_prompt_enabled'] ?? '1') !== '0',
            'pwa_icon_192' => $settings['pwa_icon_192'] ?? ($settings['app_favicon'] ?? '/favicon.ico'),
            'pwa_icon_512' => $settings['pwa_icon_512'] ?? ($settings['app_logo'] ?? '/favicon.ico'),
            'pwa_manifest_url' => url('/manifest.webmanifest'),
        ]);
    }

    /**
     * Build manifest array from settings.
     */
    public function buildManifestData(array $settings): array
    {
        $appName = $settings['pwa_name'] ?? ($settings['app_name'] ?? 'NetOps Monitor');
        $shortName = $settings['pwa_short_name'] ?? 'NetOps';
        $description = $settings['pwa_description'] ?? 'Modern Network Operations & Real-Time Uptime Monitoring';
        $themeColor = $settings['pwa_theme_color'] ?? ($settings['primary_color'] ?? '#2E4FA3');
        $bgColor = $settings['pwa_background_color'] ?? '#0F172A';
        $display = $settings['pwa_display'] ?? 'standalone';
        $orientation = $settings['pwa_orientation'] ?? 'any';

        $icon192 = $settings['pwa_icon_192'] ?? ($settings['app_favicon'] ?? '/favicon.ico');
        $icon512 = $settings['pwa_icon_512'] ?? ($settings['app_logo'] ?? '/favicon.ico');

        return [
            'name' => $appName,
            'short_name' => $shortName,
            'description' => $description,
            'start_url' => '/',
            'scope' => '/',
            'display' => $display,
            'orientation' => $orientation,
            'theme_color' => $themeColor,
            'background_color' => $bgColor,
            'icons' => [
                [
                    'src' => $icon192,
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any maskable',
                ],
                [
                    'src' => $icon512,
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any maskable',
                ],
            ],
            'categories' => ['business', 'developer tools', 'utilities'],
        ];
    }

    /**
     * Serve dynamic W3C Web App Manifest.
     */
    public function manifest(): Response
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
        }
        $dbSettings = GlobalSetting::pluck('value', 'key')->toArray();
        $settings = array_merge($settings, $dbSettings);

        $manifestData = $this->buildManifestData($settings);

        return response(json_encode($manifestData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), 200, [
            'Content-Type' => 'application/manifest+json; charset=utf-8',
            'Cache-Control' => 'no-cache, private',
        ]);
    }
}
