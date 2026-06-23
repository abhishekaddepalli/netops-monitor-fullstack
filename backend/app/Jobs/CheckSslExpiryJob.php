<?php

namespace App\Jobs;

use App\Models\AlertChannel;
use App\Models\SslCertificate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Scheduled daily (see routes/console.php, runs at config('monitoring.ssl_check_hour')).
 * Does NOT re-check certs itself — SslChecker already refreshes days_remaining
 * on every regular monitor check cycle. This job only evaluates whether a
 * still-fresh days_remaining value has crossed an alert threshold that
 * hasn't been notified yet, and sends that notification once per threshold.
 *
 * Fully wired for email. Other channel types (Slack/Telegram/webhook) log a
 * "not yet wired for SSL alerts" notice instead of silently doing nothing —
 * extending AlertSenderInterface with a generic sendRaw(string $subject,
 * string $body) method and calling it here is the natural next step.
 */
class CheckSslExpiryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $thresholds = config('monitoring.ssl_alert_days'); // [60,30,15,7,3,1]

        SslCertificate::with('monitor.organization.alertChannels')
            ->whereNotNull('days_remaining')
            ->where('days_remaining', '<=', max($thresholds))
            ->where('is_valid', true)
            ->chunkById(200, function ($certs) use ($thresholds) {
                foreach ($certs as $cert) {
                    $this->processCertificate($cert, $thresholds);
                }
            });
    }

    private function processCertificate(SslCertificate $cert, array $thresholds): void
    {
        $monitor = $cert->monitor;
        if (! $monitor || ! $monitor->organization) {
            return;
        }

        $crossedThreshold = collect($thresholds)
            ->sort()
            ->first(fn ($days) => $cert->shouldAlertForThreshold($days));

        if (! $crossedThreshold) {
            return;
        }

        $channels = $monitor->organization->alertChannels()->where('is_active', true)->get();

        foreach ($channels as $channel) {
            $this->notify($channel, $monitor, $cert);
        }

        $alreadySent = $cert->alert_thresholds_sent ?? [];
        $alreadySent[] = $crossedThreshold;
        $cert->update(['alert_thresholds_sent' => array_values(array_unique($alreadySent))]);
    }

    private function notify(AlertChannel $channel, $monitor, SslCertificate $cert): void
    {
        if ($channel->type !== 'email') {
            Log::info("SSL expiry alert for monitor {$monitor->id} skipped on channel type [{$channel->type}] — only email is wired for SSL alerts in this build.");

            return;
        }

        try {
            $recipients = (array) ($channel->config['to'] ?? []);
            if (empty($recipients)) {
                return;
            }

            Mail::send('emails.ssl-expiry-alert', [
                'monitor' => $monitor,
                'cert' => $cert,
            ], function ($message) use ($recipients, $monitor) {
                $message->to($recipients)
                    ->subject("⚠️ SSL Certificate Expiring: {$monitor->name}");
            });
        } catch (Throwable $e) {
            Log::warning("SSL expiry alert failed for monitor {$monitor->id} via channel {$channel->id}: {$e->getMessage()}");
        }
    }
}
