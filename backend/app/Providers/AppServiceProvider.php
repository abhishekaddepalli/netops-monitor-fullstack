<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use App\Models\GlobalSetting;
use Illuminate\Support\Facades\Config;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('global_settings')) {
                $host = GlobalSetting::getValue('smtp_host');
                if ($host) {
                    Config::set('mail.mailers.smtp.host', $host);
                    Config::set('mail.mailers.smtp.port', GlobalSetting::getValue('smtp_port'));
                    Config::set('mail.mailers.smtp.username', GlobalSetting::getValue('smtp_username'));
                    Config::set('mail.mailers.smtp.password', GlobalSetting::getValue('smtp_password'));
                    Config::set('mail.mailers.smtp.encryption', GlobalSetting::getValue('smtp_encryption'));
                    Config::set('mail.from.address', GlobalSetting::getValue('smtp_from_address'));
                    Config::set('mail.from.name', 'NetOps Monitor');
                }
            }
        } catch (\Exception $e) {
            // Database not set up yet (Setup Wizard phase)
        }

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
