<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;color:#142840;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="height:4px;background:linear-gradient(90deg,#FF9933 0 33%,#ffffff 33% 66%,#138808 66% 100%);"></div>
  <div style="padding:24px 28px 8px;">
    <span style="display:inline-block;padding:6px 14px;border-radius:20px;font-weight:700;font-size:14px;background:#FEF3C7;color:#FF9933;">⚠️ SSL Certificate Expiring</span>
  </div>
  <div style="padding:8px 28px 28px;">
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;width:140px;">Monitor</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;">{{ $monitor->name }}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Domain</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;font-family:monospace;">{{ $monitor->target }}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Days remaining</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;">{{ $cert->days_remaining }} days</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;">Valid until</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;">{{ $cert->valid_to?->toFormattedDateString() }}</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#64748b;">Issuer</td><td style="padding:8px 0;font-size:14px;font-weight:600;">{{ $cert->issuer }}</td></tr>
    </table>
  </div>
  <div style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">NetOps Monitor &middot; {{ config('app.name') }}</div>
</div>
</body>
</html>
