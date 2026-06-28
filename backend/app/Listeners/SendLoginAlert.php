<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Mail;
use App\Mail\LoginAlertMail;

class SendLoginAlert
{
    public function handle(Login $event): void
    {
        $user = $event->user;

        // Ensure user belongs to an organization and it has alerts enabled
        if ($user->organization_id) {
            $org = \App\Models\Organization::find($user->organization_id);
            if ($org && $org->enable_login_alerts) {
                $ipAddress = request()?->ip() ?? 'Unknown';
                $userAgent = request()?->userAgent() ?? 'Unknown';

                defer(fn() => Mail::to($user->email)->send(
                    new LoginAlertMail($user, $ipAddress, $userAgent)
                ));
            }
        }
    }
}
