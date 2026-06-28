<?php

namespace App\Mail;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use App\Services\Alerts\TemplateParser;
use Illuminate\Queue\SerializesModels;

class PerformanceReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Organization $org, public string $period, public array $metrics)
    {
    }

    public function build(): self
    {
        $subject = "Your " . ucfirst($this->period) . " Performance Report - NetOps Monitor";

        $customReplacements = [
            '{{org.name}}' => $this->org->name,
            '{{report.period}}' => ucfirst($this->period),
            '{{report.uptime_percentage}}' => $this->metrics['uptime_percentage'] . '%',
            '{{report.total_incidents}}' => $this->metrics['total_incidents'],
            '{{report.total_downtime}}' => $this->metrics['total_downtime_minutes'] . ' mins',
        ];

        // Format the metrics details
        $detailsHtmlInner = "";
        $detailsText = "";
        foreach ($this->metrics['monitors'] as $monitor) {
            $detailsText .= "- {$monitor['name']}: {$monitor['uptime']}% uptime, {$monitor['incidents']} incidents\n";
            $detailsHtmlInner .= "
                <tr>
                    <td style='padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #4b5563; font-size: 14px;'>{$monitor['name']}</td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 14px; text-align: center; font-weight: 600;'>{$monitor['uptime']}%</td>
                    <td style='padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;'>{$monitor['incidents']}</td>
                </tr>
            ";
        }

        $detailsHtml = "
            <table width='100%' border='0' cellspacing='0' cellpadding='0' style='margin-top: 10px; margin-bottom: 20px;'>
                <thead>
                    <tr>
                        <th style='text-align: left; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;'>Monitor</th>
                        <th style='text-align: center; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;'>Uptime</th>
                        <th style='text-align: right; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;'>Incidents</th>
                    </tr>
                </thead>
                <tbody>{$detailsHtmlInner}</tbody>
            </table>
        ";

        $customReplacements['{{report.details}}'] = $detailsHtml;

        $eventType = $this->period === 'weekly' ? 'weekly_report' : 'monthly_report';
        $messageBody = TemplateParser::parse('email', null, $eventType, $customReplacements);

        return $this->subject($subject)->html($messageBody);
    }
}
