<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use App\Services\Alerts\TemplateParser;
use Illuminate\Queue\SerializesModels;

class LoginAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $ipAddress, public string $userAgent)
    {
    }

    public function build(): self
    {
        $subject = "New login to your NetOps Monitor account";

        $customReplacements = [
            '{{user.name}}' => $this->user->name,
            '{{user.email}}' => $this->user->email,
            '{{login.ip}}' => $this->ipAddress,
            '{{login.device}}' => $this->userAgent,
            '{{login.time}}' => now()->toDateTimeString(),
        ];

        $messageBody = TemplateParser::parse('email', null, 'login_alert', $customReplacements);

        return $this->subject($subject)->html($messageBody);
    }
}
