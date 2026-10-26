<?php

namespace App\Services\Alerts;

class NotificationTemplateDefaults
{
    public static function getEvents(): array
    {
        return [
            'down' => 'Incident Down',
            'up' => 'Incident Resolved',
            'degraded' => 'Degraded Performance',
            'ssl_expiry' => 'SSL Expiry Warning',
            'login_alert' => 'Security Login Alert',
            'team_invite' => 'Team Invitation',
            'weekly_report' => 'Weekly SLA Report',
            'monthly_report' => 'Monthly SLA Report',
        ];
    }

    public static function getChannels(): array
    {
        return ['email', 'slack', 'discord', 'telegram', 'teams', 'whatsapp', 'sms', 'webhook', 'wirepusher'];
    }

    public static function getDefault(string $channel, string $event): string
    {
        $all = self::getAll();
        return $all[$channel][$event] ?? self::generateGenericDefault($channel, $event);
    }

    public static function getAll(): array
    {
        return [
            'email' => [
                'down' => <<<'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Incident Alert: {{monitor.name}} is DOWN</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #131d33; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 32px 28px; text-align: center;">
              <div style="font-size: 42px; margin-bottom: 8px;">🚨</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CRITICAL INCIDENT DETECTED</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">Monitor is currently unreachable</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <div style="display: inline-block; background-color: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); border-radius: 20px; padding: 6px 14px; color: #f87171; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
                ● Service DOWN
              </div>
              <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff; font-weight: 700;">{{monitor.name}}</h2>
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Our global edge probes failed to reach the target service at <strong style="color: #38bdf8;">{{time}}</strong>. An incident has been automatically opened.
              </p>

              <!-- Error Code Box -->
              <div style="background-color: #090e17; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; color: #f87171; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Root Cause / Error Message</div>
                <div style="font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #cbd5e1; word-break: break-all; line-height: 1.5;">
                  {{incident.error}}
                </div>
              </div>

              <!-- Technical Details Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 10px; border: 1px solid #1e293b; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px;">Target URL / Host</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; word-break: break-all;">{{monitor.url}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px;">Monitor Type</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-size: 13px; font-weight: 600; text-align: right;">{{monitor.type}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px;">Severity Level</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #ef4444; font-size: 13px; font-weight: 700; text-align: right;">{{incident.severity}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Started At</td>
                  <td style="padding: 12px 16px; color: #f1f5f9; font-size: 13px; font-weight: 600; text-align: right;">{{incident.started_at}}</td>
                </tr>
              </table>

              <!-- Action CTA -->
              <div style="text-align: center; margin: 32px 0 12px 0;">
                <a href="{{monitor.url}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
                  View Live Incident Dashboard →
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0d1527; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                Automated alert transmitted by <strong>NetOps Monitor Platform</strong> on {{date}} at {{time}}.<br>
                To adjust notification thresholds or frequency, visit Alert Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML,
                'up' => <<<'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Restored: {{monitor.name}} is UP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #131d33; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 32px 28px; text-align: center;">
              <div style="font-size: 42px; margin-bottom: 8px;">✅</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SERVICE FULLY RESTORED</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">All health probes passing successfully</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <div style="display: inline-block; background-color: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 20px; padding: 6px 14px; color: #34d399; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
                ● Resolved & Online
              </div>
              <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff; font-weight: 700;">{{monitor.name}}</h2>
              <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Good news! The incident affecting <strong style="color: #ffffff;">{{monitor.name}}</strong> has ended. Consecutive edge health checks have verified the service is operating normally.
              </p>

              <!-- Outage Duration Card -->
              <div style="background-color: #090e17; border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 12px; color: #34d399; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Total Downtime Duration</div>
                  <div style="font-size: 18px; color: #ffffff; font-weight: 800; margin-top: 4px;">{{incident.duration}}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; color: #64748b;">Resolved At</div>
                  <div style="font-size: 14px; color: #cbd5e1; font-weight: 600; margin-top: 4px;">{{incident.resolved_at}}</div>
                </div>
              </div>

              <!-- Technical Details Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 10px; border: 1px solid #1e293b; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px;">Target URL / Host</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; word-break: break-all;">{{monitor.url}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 13px;">Monitor Type</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b; color: #38bdf8; font-size: 13px; font-weight: 600; text-align: right;">{{monitor.type}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Started At</td>
                  <td style="padding: 12px 16px; color: #f1f5f9; font-size: 13px; font-weight: 600; text-align: right;">{{incident.started_at}}</td>
                </tr>
              </table>

              <!-- Action CTA -->
              <div style="text-align: center; margin: 32px 0 12px 0;">
                <a href="{{monitor.url}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
                  View SLA & Uptime Report →
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 28px; background-color: #0d1527; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                Automated recovery notice transmitted by <strong>NetOps Monitor Platform</strong> on {{date}} at {{time}}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML,
                'degraded' => <<<'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Performance Warning: {{monitor.name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #131d33; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px; text-align: center;">
              <div style="font-size: 36px;">⚠️</div>
              <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px; font-weight: 800;">DEGRADED PERFORMANCE WARNING</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 10px 0; color: #ffffff;">{{monitor.name}}</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                High latency or degraded response times detected for service at <strong style="color: #38bdf8;">{{monitor.url}}</strong>.
              </p>
              <div style="background-color: #090e17; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <div style="color: #fbbf24; font-size: 13px; font-weight: 700;">Issue Details:</div>
                <div style="color: #cbd5e1; font-size: 13px; margin-top: 4px;">{{incident.error}}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML,
                'ssl_expiry' => <<<'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SSL Certificate Expiring: {{monitor.name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #131d33; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #eab308, #ca8a04); padding: 28px; text-align: center;">
              <div style="font-size: 36px;">🔒</div>
              <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px; font-weight: 800;">SSL CERTIFICATE EXPIRY WARNING</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 10px 0; color: #ffffff;">{{monitor.name}} ({{monitor.target}})</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                The SSL/TLS certificate for this domain expires in <strong style="color: #facc15;">{{ssl.days_remaining}} days</strong>.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 8px; margin: 20px 0; border: 1px solid #1e293b;">
                <tr><td style="padding: 10px 16px; color: #64748b;">Issuer:</td><td style="padding: 10px 16px; color: #fff; text-align: right;">{{ssl.issuer}}</td></tr>
                <tr><td style="padding: 10px 16px; color: #64748b;">Valid Until:</td><td style="padding: 10px 16px; color: #fff; text-align: right;">{{ssl.valid_to}}</td></tr>
              </table>
              <p style="color: #94a3b8; font-size: 13px;">Please renew your certificate to avoid browser security warnings.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML,
                'login_alert' => <<<'HTML'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Security Alert: New Sign-in</title></head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#131d33;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:24px;text-align:center;">
          <div style="font-size:32px;">🛡️</div>
          <h2 style="margin:8px 0 0 0;color:#fff;">New Login to NetOps Monitor</h2>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;">A successful sign-in occurred for your account on <strong>{{date}} at {{time}}</strong>.</p>
          <div style="background:#090e17;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #1e293b;">
            <div style="color:#64748b;font-size:12px;">IP Address: <span style="color:#38bdf8;font-weight:600;">{{login.ip}}</span></div>
            <div style="color:#64748b;font-size:12px;margin-top:6px;">Device / Browser: <span style="color:#cbd5e1;">{{login.user_agent}}</span></div>
          </div>
          <p style="color:#64748b;font-size:13px;">If this wasn't you, please secure your account immediately and enable Two-Factor Authentication.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML,
                'team_invite' => <<<'HTML'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Invitation to NetOps Monitor</title></head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#131d33;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#4338ca);padding:24px;text-align:center;">
          <div style="font-size:32px;">👥</div>
          <h2 style="margin:8px 0 0 0;color:#fff;">You have been invited to a team</h2>
        </td></tr>
        <tr><td style="padding:28px;text-align:center;">
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;">You've been invited to join the workspace <strong style="color:#fff;">{{organization.name}}</strong> on NetOps Monitor.</p>
          <div style="margin:30px 0;">
            <a href="{{invite.url}}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">Accept Invitation →</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML,
                'weekly_report' => <<<'HTML'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Weekly Uptime Summary</title></head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#131d33;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:24px;text-align:center;">
          <div style="font-size:32px;">📊</div>
          <h2 style="margin:8px 0 0 0;color:#fff;">Weekly Infrastructure Report</h2>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="color:#94a3b8;font-size:14px;">Here is your network uptime executive overview for the week of {{date}}.</p>
          <div style="display:flex;gap:12px;margin:20px 0;">
            <div style="background:#090e17;border-radius:8px;padding:16px;flex:1;text-align:center;border:1px solid #1e293b;">
              <div style="color:#64748b;font-size:12px;">Average Uptime</div>
              <div style="color:#34d399;font-size:24px;font-weight:800;margin-top:4px;">99.98%</div>
            </div>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML,
                'monthly_report' => <<<'HTML'
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Monthly SLA & Uptime Report</title></head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#131d33;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);padding:24px;text-align:center;">
          <div style="font-size:32px;">📈</div>
          <h2 style="margin:8px 0 0 0;color:#fff;">Monthly SLA & Performance Report</h2>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="color:#94a3b8;font-size:14px;">Complete monthly availability summary and incident SLA metrics.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML,
            ],
            'slack' => [
                'down' => "🚨 *INCIDENT ALERT: {{monitor.name}} is DOWN*\n*Target:* `{{monitor.url}}`\n*Type:* {{monitor.type}} | *Severity:* {{incident.severity}}\n*Error:* `{{incident.error}}`\n*Started At:* {{incident.started_at}} ({{time}})\n👉 <{{monitor.url}}|View Incident in Dashboard>",
                'up' => "✅ *SERVICE RESTORED: {{monitor.name}} is UP*\n*Target:* `{{monitor.url}}`\n*Duration:* *{{incident.duration}}*\n*Resolved At:* {{incident.resolved_at}} ({{time}})\n👉 <{{monitor.url}}|View Monitor SLA>",
                'degraded' => "⚠️ *PERFORMANCE WARNING: {{monitor.name}}*\n*Target:* `{{monitor.url}}`\n*Issue:* {{incident.error}}\n*Time:* {{time}}",
                'ssl_expiry' => "🔒 *SSL EXPIRY WARNING: {{monitor.name}}*\n*Domain:* `{{monitor.target}}`\n*Days Remaining:* *{{ssl.days_remaining}} days*\n*Expires:* {{ssl.valid_to}}",
                'login_alert' => "🛡️ *Security Notice: New Login*\n*Time:* {{time}} {{date}}\n*IP:* `{{login.ip}}`\n*Agent:* {{login.user_agent}}",
                'team_invite' => "👥 *New Team Invitation*\nYou have been invited to join *{{organization.name}}*.\nAccept invitation: {{invite.url}}",
                'weekly_report' => "📊 *Weekly SLA & Uptime Summary*\nAverage Uptime: *99.98%*\nTotal Incidents: 0\nDate: {{date}}",
                'monthly_report' => "📈 *Monthly Infrastructure SLA Report*\nMonth ending: {{date}}\nGlobal availability maintained within target SLA.",
            ],
            'discord' => [
                'down' => "🚨 **[CRITICAL ALERT] {{monitor.name}} is DOWN**\n**Target:** `{{monitor.url}}`\n**Type:** {{monitor.type}} | **Severity:** {{incident.severity}}\n**Error:** ```{{incident.error}}```\n**Started:** {{incident.started_at}} ({{time}})",
                'up' => "✅ **[RESOLVED] {{monitor.name}} is back UP**\n**Target:** `{{monitor.url}}`\n**Total Outage:** **{{incident.duration}}**\n**Resolved:** {{incident.resolved_at}} ({{time}})",
                'degraded' => "⚠️ **[DEGRADED PERFORMANCE] {{monitor.name}}**\n**Target:** `{{monitor.url}}`\n**Details:** {{incident.error}}",
                'ssl_expiry' => "🔒 **[SSL WARNING] {{monitor.name}}**\nExpires in **{{ssl.days_remaining}} days** on {{ssl.valid_to}}.",
                'login_alert' => "🛡️ **Security Login Alert**\nSign-in from IP: `{{login.ip}}` at {{time}}.",
                'team_invite' => "👥 **Team Invitation**\nYou have been invited to **{{organization.name}}** on NetOps Monitor.",
                'weekly_report' => "📊 **Weekly Infrastructure Summary**\nAvailability: **99.98%** | All systems operational.",
                'monthly_report' => "📈 **Monthly SLA Report**\nReport for {{date}} completed.",
            ],
            'telegram' => [
                'down' => "🚨 <b>ALERT: {{monitor.name}} is DOWN</b>\n\n<b>Target:</b> <code>{{monitor.url}}</code>\n<b>Type:</b> {{monitor.type}}\n<b>Error:</b> <code>{{incident.error}}</code>\n<b>Time:</b> {{time}} ({{date}})",
                'up' => "✅ <b>RESOLVED: {{monitor.name}} is back UP</b>\n\n<b>Target:</b> <code>{{monitor.url}}</code>\n<b>Downtime Duration:</b> <b>{{incident.duration}}</b>\n<b>Restored:</b> {{time}} ({{date}})",
                'degraded' => "⚠️ <b>WARNING: {{monitor.name}} Degraded</b>\n\nTarget: <code>{{monitor.url}}</code>\nLatency / Error: <code>{{incident.error}}</code>",
                'ssl_expiry' => "🔒 <b>SSL WARNING: {{monitor.name}}</b>\n\nExpires in: <b>{{ssl.days_remaining}} days</b>\nValid to: {{ssl.valid_to}}",
                'login_alert' => "🛡️ <b>Security Alert: New Sign-in</b>\n\nIP: <code>{{login.ip}}</code>\nTime: {{time}}",
                'team_invite' => "👥 <b>Team Invitation</b>\nJoin <b>{{organization.name}}</b>: {{invite.url}}",
                'weekly_report' => "📊 <b>Weekly Uptime Report</b>\nAvailability: 99.98%\nDate: {{date}}",
                'monthly_report' => "📈 <b>Monthly SLA Summary</b>\nReport generated for {{date}}.",
            ],
            'teams' => [
                'down' => "🚨 **ALERT: {{monitor.name}} is DOWN**\n\n* **Target:** {{monitor.url}}\n* **Error:** `{{incident.error}}`\n* **Severity:** {{incident.severity}}\n* **Time:** {{time}}",
                'up' => "✅ **RESOLVED: {{monitor.name}} is back UP**\n\n* **Target:** {{monitor.url}}\n* **Outage Duration:** {{incident.duration}}\n* **Resolved At:** {{incident.resolved_at}}",
                'degraded' => "⚠️ **WARNING: {{monitor.name}} Performance Degraded**\n\n* **Target:** {{monitor.url}}\n* **Issue:** {{incident.error}}",
                'ssl_expiry' => "🔒 **SSL Expiry Notice for {{monitor.name}}**\n\n* **Days Remaining:** {{ssl.days_remaining}}\n* **Expiry Date:** {{ssl.valid_to}}",
                'login_alert' => "🛡️ **Security Alert: New Login** from {{login.ip}} at {{time}}.",
                'team_invite' => "👥 **Team Invitation:** Join {{organization.name}}.",
                'weekly_report' => "📊 **Weekly Uptime Summary:** 99.98% availability.",
                'monthly_report' => "📈 **Monthly SLA Report:** {{date}}.",
            ],
            'whatsapp' => [
                'down' => "🚨 *ALERT: {{monitor.name}} is DOWN*\n*Target:* {{monitor.url}}\n*Error:* {{incident.error}}\n*Time:* {{time}}\n*Status:* Action Required",
                'up' => "✅ *RESOLVED: {{monitor.name}} is UP*\n*Target:* {{monitor.url}}\n*Downtime:* {{incident.duration}}\n*Restored:* {{time}}",
                'degraded' => "⚠️ *WARNING: {{monitor.name}} Degraded*\n*Target:* {{monitor.url}}\n*Issue:* {{incident.error}}",
                'ssl_expiry' => "🔒 *SSL WARNING: {{monitor.name}}*\nExpires in *{{ssl.days_remaining}} days*.",
                'login_alert' => "🛡️ *Security Notice: Login from {{login.ip}} at {{time}}*",
                'team_invite' => "👥 *Team Invitation to {{organization.name}}*: {{invite.url}}",
                'weekly_report' => "📊 *Weekly Uptime:* 99.98% on {{date}}",
                'monthly_report' => "📈 *Monthly Report:* {{date}}",
            ],
            'sms' => [
                'down' => "🚨 NetOps ALERT: {{monitor.name}} is DOWN. Error: {{incident.error}}. Time: {{time}}.",
                'up' => "✅ NetOps RESOLVED: {{monitor.name}} is back UP. Outage duration: {{incident.duration}}.",
                'degraded' => "⚠️ NetOps WARNING: {{monitor.name}} is experiencing degraded latency at {{time}}.",
                'ssl_expiry' => "🔒 NetOps SSL: Certificate for {{monitor.name}} expires in {{ssl.days_remaining}} days.",
                'login_alert' => "🛡️ NetOps Security: New login to your account from {{login.ip}} at {{time}}.",
                'team_invite' => "👥 You have been invited to join {{organization.name}} on NetOps Monitor: {{invite.url}}",
                'weekly_report' => "📊 NetOps Weekly SLA: 99.98% uptime achieved for period {{date}}.",
                'monthly_report' => "📈 NetOps Monthly SLA: 99.95% uptime recorded for {{date}}.",
            ],
            'webhook' => [
                'down' => <<<'JSON'
{
  "event": "incident.down",
  "monitor": {
    "name": "{{monitor.name}}",
    "type": "{{monitor.type}}",
    "target": "{{monitor.url}}",
    "interval": "{{monitor.interval}}"
  },
  "incident": {
    "severity": "{{incident.severity}}",
    "error": "{{incident.error}}",
    "started_at": "{{incident.started_at}}"
  },
  "timestamp": "{{date}}T{{time}}Z"
}
JSON,
                'up' => <<<'JSON'
{
  "event": "incident.resolved",
  "monitor": {
    "name": "{{monitor.name}}",
    "type": "{{monitor.type}}",
    "target": "{{monitor.url}}"
  },
  "incident": {
    "duration": "{{incident.duration}}",
    "resolved_at": "{{incident.resolved_at}}"
  },
  "timestamp": "{{date}}T{{time}}Z"
}
JSON,
                'degraded' => <<<'JSON'
{
  "event": "incident.degraded",
  "monitor": {
    "name": "{{monitor.name}}",
    "target": "{{monitor.url}}"
  },
  "issue": "{{incident.error}}",
  "timestamp": "{{date}}T{{time}}Z"
}
JSON,
                'ssl_expiry' => <<<'JSON'
{
  "event": "ssl.expiry_warning",
  "monitor": "{{monitor.name}}",
  "days_remaining": "{{ssl.days_remaining}}",
  "valid_to": "{{ssl.valid_to}}",
  "timestamp": "{{date}}T{{time}}Z"
}
JSON,
                'login_alert' => <<<'JSON'
{
  "event": "security.login_alert",
  "ip": "{{login.ip}}",
  "user_agent": "{{login.user_agent}}",
  "timestamp": "{{date}}T{{time}}Z"
}
JSON,
                'team_invite' => <<<'JSON'
{
  "event": "team.invited",
  "organization": "{{organization.name}}",
  "url": "{{invite.url}}"
}
JSON,
                'weekly_report' => <<<'JSON'
{
  "event": "report.weekly",
  "uptime_percent": 99.98,
  "date": "{{date}}"
}
JSON,
                'monthly_report' => <<<'JSON'
{
  "event": "report.monthly",
  "uptime_percent": 99.95,
  "date": "{{date}}"
}
JSON,
            ],
            'wirepusher' => [
                'down' => "🚨 ALERT: {{monitor.name}} is DOWN\nError: {{incident.error}}\nTime: {{time}}",
                'up' => "✅ RESOLVED: {{monitor.name}} is back UP\nDowntime: {{incident.duration}}\nTime: {{time}}",
                'degraded' => "⚠️ WARNING: {{monitor.name}} Degraded\nIssue: {{incident.error}}",
                'ssl_expiry' => "🔒 SSL WARNING: {{monitor.name}} expires in {{ssl.days_remaining}} days.",
                'login_alert' => "🛡️ Security: Sign-in from {{login.ip}} at {{time}}.",
                'team_invite' => "👥 Team Invite: {{organization.name}}",
                'weekly_report' => "📊 Weekly SLA: 99.98% uptime.",
                'monthly_report' => "📈 Monthly SLA Report: {{date}}.",
            ],
        ];
    }

    private static function generateGenericDefault(string $channel, string $event): string
    {
        $status = strtoupper($event);
        return "[$status] NetOps Alert: {{monitor.name}} ({$event})\nTarget: {{monitor.url}}\nTime: {{time}} {{date}}";
    }
}
