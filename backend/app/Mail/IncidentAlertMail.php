<?php

namespace App\Mail;

use App\Models\Incident;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use App\Services\Alerts\TemplateParser;
use Illuminate\Queue\SerializesModels;

class IncidentAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Incident $incident, public string $event)
    {
    }

    public function build(): self
    {
        $isDown = $this->event === 'down';
        $monitor = $this->incident->monitor;

        $subject = $isDown
            ? "🚨 Monitor Down: {$monitor->name}"
            : "✅ Service Restored: {$monitor->name}";

        $messageBody = TemplateParser::parse('email', $this->incident, $this->event);

        return $this->subject($subject)
            ->html($messageBody);
    }
}
