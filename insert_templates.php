<?php
// insert_templates.php

require __DIR__ . '/backend/vendor/autoload.php';
$app = require_once __DIR__ . '/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\NotificationTemplate;

$templates = [
    [
        'channel_type' => 'email',
        'event_type' => 'login_alert',
        'is_active' => true,
        'content' => '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                <h2 style="margin: 0; color: #1f2937;">New Login Detected</h2>
            </div>
            <div style="padding: 30px;">
                <p style="color: #4b5563; font-size: 16px;">Hello {{user.name}},</p>
                <p style="color: #4b5563; font-size: 16px;">We detected a new login to your account.</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>IP Address:</strong> {{login.ip}}</p>
                    <p style="margin: 5px 0;"><strong>Device:</strong> {{login.device}}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> {{login.time}}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">If this was you, you can safely ignore this email. If not, please secure your account immediately.</p>
            </div>
        </div>'
    ],
    [
        'channel_type' => 'email',
        'event_type' => 'team_invite',
        'is_active' => true,
        'content' => '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                <h2 style="margin: 0; color: #ffffff;">You\'ve been invited!</h2>
            </div>
            <div style="padding: 30px;">
                <p style="color: #4b5563; font-size: 16px;">Hello {{user.name}},</p>
                <p style="color: #4b5563; font-size: 16px;">You have been invited to join <strong>{{org.name}}</strong> on NetOps Monitor.</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #4b5563;">Your temporary password is:</p>
                    <h3 style="margin: 0; color: #1f2937; letter-spacing: 2px;">{{invite.password}}</h3>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{{invite.link}}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login Now</a>
                </div>
            </div>
        </div>'
    ],
    [
        'channel_type' => 'email',
        'event_type' => 'weekly_report',
        'is_active' => true,
        'content' => '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #10b981; padding: 20px; text-align: center;">
                <h2 style="margin: 0; color: #ffffff;">Weekly Performance Report</h2>
            </div>
            <div style="padding: 30px;">
                <p style="color: #4b5563; font-size: 16px;">Here is the performance summary for <strong>{{org.name}}</strong>.</p>
                <div style="display: flex; gap: 10px; margin: 20px 0;">
                    <div style="flex: 1; background-color: #f9fafb; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #f3f4f6;">
                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Uptime</div>
                        <div style="color: #10b981; font-size: 24px; font-weight: bold;">{{report.uptime_percentage}}</div>
                    </div>
                    <div style="flex: 1; background-color: #f9fafb; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #f3f4f6;">
                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Incidents</div>
                        <div style="color: #ef4444; font-size: 24px; font-weight: bold;">{{report.total_incidents}}</div>
                    </div>
                </div>
                <h3 style="color: #374151; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Monitor Details</h3>
                {{report.details}}
            </div>
        </div>'
    ],
    [
        'channel_type' => 'email',
        'event_type' => 'monthly_report',
        'is_active' => true,
        'content' => '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #8b5cf6; padding: 20px; text-align: center;">
                <h2 style="margin: 0; color: #ffffff;">Monthly Performance Report</h2>
            </div>
            <div style="padding: 30px;">
                <p style="color: #4b5563; font-size: 16px;">Here is the performance summary for <strong>{{org.name}}</strong>.</p>
                <div style="display: flex; gap: 10px; margin: 20px 0;">
                    <div style="flex: 1; background-color: #f9fafb; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #f3f4f6;">
                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Uptime</div>
                        <div style="color: #8b5cf6; font-size: 24px; font-weight: bold;">{{report.uptime_percentage}}</div>
                    </div>
                    <div style="flex: 1; background-color: #f9fafb; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #f3f4f6;">
                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Incidents</div>
                        <div style="color: #ef4444; font-size: 24px; font-weight: bold;">{{report.total_incidents}}</div>
                    </div>
                </div>
                <h3 style="color: #374151; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Monitor Details</h3>
                {{report.details}}
            </div>
        </div>'
    ]
];

foreach ($templates as $t) {
    NotificationTemplate::firstOrCreate([
        'channel_type' => $t['channel_type'],
        'event_type' => $t['event_type'],
    ], [
        'is_active' => $t['is_active'],
        'content' => $t['content'],
    ]);
}

echo "Templates inserted successfully.\n";
