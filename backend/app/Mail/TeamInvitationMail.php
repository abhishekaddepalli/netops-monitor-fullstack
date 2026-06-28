<?php

namespace App\Mail;

use App\Models\User;
use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use App\Services\Alerts\TemplateParser;
use Illuminate\Queue\SerializesModels;

class TeamInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public Organization $org, public string $tempPassword)
    {
    }

    public function build(): self
    {
        $subject = "You have been invited to join {$this->org->name} on NetOps Monitor";

        $customReplacements = [
            '{{user.name}}' => $this->user->name,
            '{{user.email}}' => $this->user->email,
            '{{org.name}}' => $this->org->name,
            '{{invite.password}}' => $this->tempPassword,
            '{{invite.link}}' => rtrim(config('app.frontend_url', 'http://localhost:5173'), '/') . '/login',
        ];

        $messageBody = TemplateParser::parse('email', null, 'team_invite', $customReplacements);

        return $this->subject($subject)->html($messageBody);
    }
}
