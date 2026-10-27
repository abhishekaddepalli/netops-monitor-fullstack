<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use App\Models\GlobalSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Auth\Events\Login::class,
            \App\Listeners\SendLoginAlert::class
        );

        $this->loadSmtpConfig();
        $this->loadBroadcastConfig();

        \Illuminate\Support\Facades\Queue::before(function (\Illuminate\Queue\Events\JobProcessing $event) {
            $this->loadSmtpConfig();
            $this->loadBroadcastConfig();
        });

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }

    private function loadSmtpConfig(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('global_settings')) {
                $host = GlobalSetting::getValue('smtp_host');
                if ($host) {
                    Config::set('mail.mailers.smtp.host', $host);
                    Config::set('mail.mailers.smtp.port', GlobalSetting::getValue('smtp_port', 587));
                    Config::set('mail.mailers.smtp.username', GlobalSetting::getValue('smtp_username'));
                    Config::set('mail.mailers.smtp.password', GlobalSetting::getValue('smtp_password'));
                    Config::set('mail.mailers.smtp.encryption', GlobalSetting::getValue('smtp_encryption', 'tls'));
                    Config::set('mail.from.address', GlobalSetting::getValue('smtp_from_address'));
                    Config::set('mail.from.name', 'NetOps Monitor');
                    Mail::purge('smtp');
                }
            }
        } catch (\Throwable $e) {
            // Ignore DB errors during setup/migration
        }
    }

    private function loadBroadcastConfig(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('global_settings')) {
                $pusherKey = GlobalSetting::getValue('pusher_app_key');
                if ($pusherKey) {
                    Config::set('broadcasting.default', 'pusher');
                    Config::set('broadcasting.connections.pusher.key', $pusherKey);
                    Config::set('broadcasting.connections.pusher.secret', GlobalSetting::getValue('pusher_app_secret'));
                    Config::set('broadcasting.connections.pusher.app_id', GlobalSetting::getValue('pusher_app_id'));
                    Config::set('broadcasting.connections.pusher.options.cluster', GlobalSetting::getValue('pusher_app_cluster', 'mt1'));
                }
            }
        } catch (\Throwable $e) {
            // Ignore DB errors during setup/migration
        }
    }
}
