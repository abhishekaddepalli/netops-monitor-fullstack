<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true);
        }
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
            'company_name', 'company_address', 'company_gst', 'invoice_prefix'
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

        $settings = array_merge($settings, $data);

        Storage::put('global_settings.json', json_encode($settings, JSON_PRETTY_PRINT));

        return response()->json($settings);
    }

    public function publicShow(): JsonResponse
    {
        $settings = [];
        if (Storage::exists('global_settings.json')) {
            $settings = json_decode(Storage::get('global_settings.json'), true) ?? [];
        }
        
        // Return only safe public settings
        return response()->json([
            'app_name' => $settings['app_name'] ?? 'NetOps Monitor',
            'app_logo' => $settings['app_logo'] ?? null,
            'app_favicon' => $settings['app_favicon'] ?? null,
            'primary_color' => $settings['primary_color'] ?? '#2E4FA3',
            'custom_css' => $settings['custom_css'] ?? null,
            'timezone' => $settings['timezone'] ?? 'UTC',
            'time_format' => $settings['time_format'] ?? '24h',
        ]);
    }
}
