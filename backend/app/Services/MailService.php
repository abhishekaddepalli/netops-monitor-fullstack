<?php

namespace App\Services;

use App\Models\GlobalSetting;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\User;
use App\Models\Incident;
use App\Mail\PerformanceReportMail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

class MailService
{
    /**
     * Dynamically loads SMTP configuration from GlobalSetting table
     * and reconfigures Laravel mailer on the fly.
     */
    public static function configureSmtp(): void
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasTable('global_settings')) {
                return;
            }

            $host = GlobalSetting::getValue('smtp_host');
            if (! $host) {
                return;
            }

            $port = (int) GlobalSetting::getValue('smtp_port', 587);
            $username = GlobalSetting::getValue('smtp_username');
            $password = GlobalSetting::getValue('smtp_password');
            $encryption = strtolower((string) GlobalSetting::getValue('smtp_encryption', 'tls'));
            $fromAddress = GlobalSetting::getValue('smtp_from_address') 
                ?? config('mail.from.address', 'alerts@netopsmonitor.in');
            $fromName = GlobalSetting::getValue('company_name', 'NetOps Monitor');

            Config::set('mail.default', 'smtp');
            Config::set('mail.mailers.smtp.transport', 'smtp');
            Config::set('mail.mailers.smtp.host', $host);
            Config::set('mail.mailers.smtp.port', $port);
            Config::set('mail.mailers.smtp.username', $username);
            Config::set('mail.mailers.smtp.password', $password);

            // Handle SSL/SMTPS for port 465 vs STARTTLS for port 587
            if ($port === 465 || $encryption === 'ssl') {
                Config::set('mail.mailers.smtp.scheme', 'smtps');
                Config::set('mail.mailers.smtp.encryption', 'ssl');
            } else {
                Config::set('mail.mailers.smtp.scheme', null);
                Config::set('mail.mailers.smtp.encryption', $encryption ?: 'tls');
            }

            Config::set('mail.from.address', $fromAddress);
            Config::set('mail.from.name', $fromName);

            // Purge the cached mailer instance so new credentials take effect immediately
            Mail::purge('smtp');
        } catch (Throwable $e) {
            Log::warning('MailService::configureSmtp failed: ' . $e->getMessage());
        }
    }

    /**
     * Send a raw HTML or Blade-rendered notification email.
     */
    public static function sendNotification(
        string|array $to,
        string $title,
        string $messageText,
        array $details = [],
        ?string $actionUrl = null,
        ?string $actionText = null
    ): void {
        self::configureSmtp();

        $recipients = is_array($to) ? array_filter($to) : [trim($to)];
        if (empty($recipients)) {
            throw new RuntimeException('No recipient email provided.');
        }

        $appName = GlobalSetting::getValue('company_name', 'NetOps Monitor');
        $primaryColor = GlobalSetting::getValue('primary_color', '#0284c7');

        $html = view('emails.notification', [
            'appName' => $appName,
            'primaryColor' => $primaryColor,
            'title' => $title,
            'messageText' => $messageText,
            'details' => $details,
            'actionUrl' => $actionUrl,
            'actionText' => $actionText ?? 'View in Dashboard',
        ])->render();

        try {
            Mail::html($html, function ($msg) use ($recipients, $title, $appName) {
                $msg->to($recipients)
                    ->subject("{$appName} - {$title}");
            });

            Log::info("Notification email sent to " . implode(',', $recipients) . ": {$title}");
        } catch (Throwable $e) {
            Log::error("MailService::sendNotification failed: " . $e->getMessage());
            throw new RuntimeException('SMTP email delivery failed: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Send Welcome & Registration confirmation email to new user.
     */
    public static function sendWelcome(User $user, Organization $org): void
    {
        $appName = GlobalSetting::getValue('company_name', 'NetOps Monitor');
        $appUrl = config('app.url', 'https://infmonitor.infiniforge.cloud');

        $details = [
            'Account Name' => $user->name,
            'Organization' => $org->name,
            'Plan' => ucfirst($org->plan ?? 'Free'),
            'Login Email' => $user->email,
            'Trial Duration' => '14 Days Free Trial',
        ];

        self::sendNotification(
            to: $user->email,
            title: "Welcome to {$appName}! 🚀",
            messageText: "Hello {$user->name},\n\nYour account and organization workspace are ready! You can now configure your monitors, view network maps, and set up multi-channel alerts.",
            details: $details,
            actionUrl: rtrim($appUrl, '/') . '/dashboard',
            actionText: 'Go to Dashboard'
        );
    }

    /**
     * Send Invoice confirmation / approval email.
     */
    public static function sendInvoice(Invoice $invoice, ?string $recipientEmail = null): void
    {
        $org = $invoice->organization ?? Organization::find($invoice->organization_id);
        
        $to = $recipientEmail 
            ?: ($org?->billing_email 
            ?: $org?->users()->wherePivot('role', 'org_admin')->first()?->email 
            ?: $org?->users()->first()?->email);

        if (! $to) {
            throw new RuntimeException('No recipient email found for this invoice or organization.');
        }

        $appName = GlobalSetting::getValue('company_name', 'NetOps Monitor');
        $appUrl = config('app.url', 'https://infmonitor.infiniforge.cloud');
        $isPaid = $invoice->status === 'paid';

        $title = $isPaid 
            ? "Payment Approved: Invoice #{$invoice->invoice_number}" 
            : "Invoice #{$invoice->invoice_number} Generated";

        $message = $isPaid
            ? "Great news! Your payment for Invoice #{$invoice->invoice_number} has been verified and approved. Your subscription is active."
            : "An invoice #{$invoice->invoice_number} has been generated for your subscription. Please review the details below.";

        $details = [
            'Invoice Number' => $invoice->invoice_number,
            'Organization' => $org?->name ?? 'N/A',
            'Amount' => 'INR ' . number_format((float) $invoice->amount, 2),
            'Status' => ucfirst($invoice->status),
            'Date' => $invoice->created_at ? $invoice->created_at->format('d M Y, H:i') : now()->format('d M Y, H:i'),
        ];

        if ($invoice->provider_invoice_id) {
            $details['UTR / Reference'] = $invoice->provider_invoice_id;
        }

        self::sendNotification(
            to: $to,
            title: $title,
            messageText: $message,
            details: $details,
            actionUrl: rtrim($appUrl, '/') . '/billing',
            actionText: 'View Invoices & Billing'
        );
    }

    /**
     * Generate and send monthly / weekly performance SLA report.
     */
    public static function sendPeriodicReport(Organization $org, string $period = 'monthly', ?string $toEmail = null): array
    {
        self::configureSmtp();

        $startDate = $period === 'weekly' ? now()->subWeek() : now()->subMonth();
        $monitors = $org->monitors()->get();
        $totalIncidents = 0;
        $totalDowntimeMinutes = 0;
        $monitorMetrics = [];

        foreach ($monitors as $monitor) {
            $incidents = Incident::where('monitor_id', $monitor->id)
                ->where('started_at', '>=', $startDate)
                ->get();
            
            $monitorIncidents = $incidents->count();
            $monitorDowntime = 0;

            foreach ($incidents as $inc) {
                $end = $inc->resolved_at ?? now();
                $monitorDowntime += $inc->started_at->diffInMinutes($end);
            }

            $totalIncidents += $monitorIncidents;
            $totalDowntimeMinutes += $monitorDowntime;

            $totalMinutesInPeriod = $startDate->diffInMinutes(now());
            $uptime = $totalMinutesInPeriod > 0 
                ? max(0, min(100, round((($totalMinutesInPeriod - $monitorDowntime) / $totalMinutesInPeriod) * 100, 2))) 
                : 100.0;

            $monitorMetrics[] = [
                'name' => $monitor->name,
                'uptime' => $uptime,
                'incidents' => $monitorIncidents,
                'downtime_minutes' => $monitorDowntime,
            ];
        }

        $totalMinutesPeriod = $startDate->diffInMinutes(now());
        $globalUptime = $totalMinutesPeriod > 0
            ? max(0, min(100, round((($totalMinutesPeriod - $totalDowntimeMinutes) / $totalMinutesPeriod) * 100, 2)))
            : 100.0;

        $metrics = [
            'uptime_percentage' => $globalUptime,
            'total_incidents' => $totalIncidents,
            'total_downtime_minutes' => $totalDowntimeMinutes,
            'monitors' => $monitorMetrics,
        ];

        $recipients = [];
        if ($toEmail) {
            $recipients[] = $toEmail;
        } else {
            $admins = $org->users()->wherePivot('role', 'org_admin')->get();
            foreach ($admins as $admin) {
                if ($admin->email) {
                    $recipients[] = $admin->email;
                }
            }
            if (empty($recipients)) {
                $first = $org->users()->first();
                if ($first?->email) {
                    $recipients[] = $first->email;
                }
            }
        }

        if (empty($recipients)) {
            throw new RuntimeException("No recipient emails found for organization '{$org->name}'.");
        }

        foreach ($recipients as $email) {
            Mail::to($email)->send(new PerformanceReportMail($org, $period, $metrics));
        }

        return [
            'recipients' => $recipients,
            'metrics' => $metrics,
        ];
    }
}
