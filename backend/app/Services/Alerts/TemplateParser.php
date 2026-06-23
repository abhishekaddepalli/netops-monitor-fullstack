<?php

namespace App\Services\Alerts;

use App\Models\Incident;
use App\Models\NotificationTemplate;

class TemplateParser
{
    /**
     * Parse a template for a specific channel and event type, substituting incident variables.
     */
    public static function parse(string $channelType, Incident $incident, string $event): string
    {
        $template = NotificationTemplate::where('channel_type', $channelType)
            ->where('event_type', $event)
            ->where('is_active', true)
            ->first();

        $monitor = $incident->monitor;
        $config = is_array($monitor->config) ? $monitor->config : [];

        // Get the actual error message. The incident model doesn't have an error_message 
        // column, so we parse it from the root cause, title, or the first auto-generated update.
        $errorMessage = $incident->root_cause 
            ?? $incident->updates()->oldest()->first()?->message 
            ?? $incident->title 
            ?? 'Unknown error';

        // Clean up "Auto-incident created — 3 consecutive failed checks. " prefix if present
        $errorMessage = preg_replace('/^Auto-incident created — \d+ consecutive failed checks\. /', '', $errorMessage);

        // Build standard replacements
        $replacements = [
            '{{monitor.name}}' => $monitor->name,
            '{{monitor.type}}' => strtoupper($monitor->type),
            '{{monitor.target}}' => $monitor->target ?? 'N/A',
            '{{monitor.url}}' => $monitor->target ?? 'N/A', // Backwards compatibility
            '{{monitor.port}}' => $monitor->port ?? 'N/A',
            '{{monitor.interval}}' => $monitor->check_interval_seconds . 's',
            '{{incident.error}}' => $errorMessage,
            '{{incident.started_at}}' => $incident->started_at ? $incident->started_at->toDateTimeString() : 'N/A',
            '{{incident.resolved_at}}' => $incident->resolved_at ? $incident->resolved_at->toDateTimeString() : 'N/A',
            '{{incident.severity}}' => strtoupper($incident->severity),
            '{{time}}' => now()->format('H:i:s'),
            '{{date}}' => now()->format('Y-m-d'),
        ];

        // Inject type-specific parameters
        if ($monitor->type === 'ssl' && $monitor->sslCertificate) {
            $replacements['{{ssl.issuer}}'] = $monitor->sslCertificate->issuer ?? 'Unknown';
            $replacements['{{ssl.valid_to}}'] = $monitor->sslCertificate->valid_to ? $monitor->sslCertificate->valid_to->toDateTimeString() : 'Unknown';
            $replacements['{{ssl.days_remaining}}'] = $monitor->sslCertificate->valid_to ? now()->diffInDays($monitor->sslCertificate->valid_to, false) : 'N/A';
        } elseif ($monitor->type === 'dns') {
            $replacements['{{dns.type}}'] = $config['dns_type'] ?? 'N/A';
            $replacements['{{dns.expected}}'] = $config['expected_value'] ?? 'N/A';
        } elseif ($monitor->type === 'heartbeat') {
            $replacements['{{heartbeat.last_ping}}'] = $monitor->heartbeat_last_ping_at 
                ? $monitor->heartbeat_last_ping_at->toDateTimeString() 
                : 'Never received';
            $replacements['{{heartbeat.url}}'] = $monitor->heartbeatUrl();
        } elseif ($monitor->type === 'api') {
            $replacements['{{api.method}}'] = $config['method'] ?? 'GET';
        }

        // Build monitor.details block
        $detailsText = "";
        $detailsHtmlInner = "";
        foreach ($replacements as $key => $val) {
            if (in_array($key, ['{{monitor.name}}', '{{time}}', '{{date}}', '{{incident.error}}'])) continue;
            if ($val === 'N/A' || $val === '' || $val === 'Unknown') continue;
            $label = ucwords(str_replace(['{{', '}}', '_', '.'], ['', '', ' ', ' '], $key));
            $detailsText .= "- {$label}: {$val}\n";
            $detailsHtmlInner .= "
                <tr>
                    <td style='padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 500; font-size: 14px;'>{$label}</td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;'>{$val}</td>
                </tr>
            ";
        }
        $detailsHtml = "<table width='100%' border='0' cellspacing='0' cellpadding='0' style='margin-top: 10px; margin-bottom: 20px;'><tbody>{$detailsHtmlInner}</tbody></table>";
        
        $replacements['{{monitor.details}}'] = $channelType === 'email' ? $detailsHtml : $detailsText;

        // Return user's custom template if defined
        if ($template) {
            return str_replace(array_keys($replacements), array_values($replacements), $template->content);
        }

        // Otherwise, return fallback template
        $isDown = $event === 'down';
        
        if ($channelType === 'email') {
            return self::buildHtmlEmail($incident, $isDown, $replacements, $detailsHtmlInner);
        }

        // Text fallback for non-email channels
        $statusStr = $isDown ? 'DOWN' : 'UP';
        $msg = "[$statusStr] {$monitor->name} ({$monitor->type})\n";
        $msg .= "Time: " . now()->format('H:i:s Y-m-d') . "\n";
        if ($isDown) {
            $msg .= "Error: {$incident->error_message}\n";
        }
        $msg .= "\nDetails:\n{$detailsText}";
        return $msg;
    }

    private static function buildHtmlEmail(Incident $incident, bool $isDown, array $replacements, string $detailsHtmlInner): string
    {
        $color = $isDown ? '#ef4444' : '#22c55e';
        $icon = $isDown ? '🚨' : '✅';
        $title = $isDown ? 'Monitor Alert: Service Down' : 'Monitor Recovered: Service Up';
        $statusText = $isDown ? 'DOWN' : 'RECOVERED';
        
        $errorBlock = '';
        if ($isDown) {
            $errorBlock = "
                <div style='background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px; margin-bottom: 24px; text-align: left;'>
                    <h3 style='color: #991b1b; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;'>Error Details</h3>
                    <p style='color: #7f1d1d; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; margin: 0; word-break: break-all;'>
                        {$replacements['{{incident.error}}']}
                    </p>
                </div>
            ";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>{$title}</title>
        </head>
        <body style='margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;'>
            <table width='100%' border='0' cellspacing='0' cellpadding='0' bgcolor='#f3f4f6' style='padding: 40px 20px;'>
                <tr>
                    <td align='center'>
                        <table width='100%' max-width='600' border='0' cellspacing='0' cellpadding='0' bgcolor='#ffffff' style='max-width: 600px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;'>
                            
                            <!-- Header -->
                            <tr>
                                <td align='center' bgcolor='{$color}' style='padding: 24px;'>
                                    <div style='font-size: 40px; line-height: 1; margin-bottom: 8px;'>{$icon}</div>
                                    <h1 style='color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;'>{$title}</h1>
                                </td>
                            </tr>
                            
                            <!-- Body -->
                            <tr>
                                <td style='padding: 32px;'>
                                    <p style='color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;'>
                                        Your monitor <strong style='color: #111827;'>{$replacements['{{monitor.name}}']}</strong> is currently <span style='color: {$color}; font-weight: 700;'>{$statusText}</span>.
                                    </p>
                                    
                                    {$errorBlock}
                                    
                                    <h3 style='color: #374151; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;'>Incident Details</h3>
                                    
                                    <table width='100%' border='0' cellspacing='0' cellpadding='0' style='margin-bottom: 32px;'>
                                        <tbody>
                                            {$detailsHtmlInner}
                                        </tbody>
                                    </table>
                                    
                                    <div style='text-align: center;'>
                                        <a href='#' style='display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 15px; text-decoration: none; padding: 12px 24px; border-radius: 6px;'>View Dashboard</a>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align='center' bgcolor='#f9fafb' style='padding: 20px; border-top: 1px solid #e5e7eb;'>
                                    <p style='color: #9ca3af; font-size: 13px; margin: 0;'>
                                        Generated by <strong>NetOps Monitor</strong><br>
                                        {$replacements['{{date}}']} at {$replacements['{{time}}']}
                                    </p>
                                    <div style='margin-top: 15px; padding-top: 15px; border-top: 1px dashed #d1d5db;'>
                                        <p style='color: #6b7280; font-size: 12px; margin: 0; font-style: italic;'>
                                            ✨ Developed by <span style='color: #4f46e5; font-weight: 600;'>Abhishek Addepalli</span> ✨
                                        </p>
                                    </div>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        ";
    }
}
