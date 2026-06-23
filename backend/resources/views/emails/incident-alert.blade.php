<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;color:#142840;}
  .card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;}
  .strip{height:4px;background:linear-gradient(90deg,#FF9933 0 33%,#ffffff 33% 66%,#138808 66% 100%);}
  .header{padding:24px 28px 8px;}
  .badge{display:inline-block;padding:6px 14px;border-radius:20px;font-weight:700;font-size:14px;}
  .badge-down{background:#FEE2E2;color:#DC2626;}
  .badge-up{background:#DCFCE7;color:#138808;}
  .body{padding:8px 28px 28px;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}
  td{padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;}
  td.label{color:#64748b;width:120px;}
  td.value{font-weight:600;font-family:monospace;}
  .footer{padding:16px 28px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;}
</style>
</head>
<body>
<div class="card">
  <div class="strip"></div>
  <div class="header">
    @if($isDown)
      <span class="badge badge-down">🚨 Monitor Down</span>
    @else
      <span class="badge badge-up">✅ Service Restored</span>
    @endif
  </div>
  <div class="body">
    <table>
      <tr><td class="label">Monitor</td><td class="value">{{ $monitor->name }}</td></tr>
      <tr><td class="label">Target</td><td class="value">{{ $monitor->target }}</td></tr>
      @if($isDown)
        <tr><td class="label">Started</td><td class="value">{{ $incident->started_at->toDayDateTimeString() }}</td></tr>
        <tr><td class="label">Error</td><td class="value">{{ $incident->title }}</td></tr>
      @else
        <tr><td class="label">Downtime</td><td class="value">{{ $downtimeFormatted ?? '—' }}</td></tr>
        <tr><td class="label">Recovered</td><td class="value">{{ $incident->resolved_at?->toDayDateTimeString() }}</td></tr>
      @endif
    </table>
  </div>
  <div class="footer">NetOps Monitor &middot; {{ config('app.name') }}</div>
</div>
</body>
</html>
