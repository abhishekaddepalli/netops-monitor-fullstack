<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 40px 0; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: {{ $primaryColor ?? '#2E4FA3' }}; padding: 30px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content h2 { margin-top: 0; color: #1a1a1a; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .box strong { display: inline-block; width: 120px; color: #4a5568; }
    .btn { display: inline-block; background-color: {{ $primaryColor ?? '#2E4FA3' }}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; }
    .footer { text-align: center; padding: 20px; font-size: 13px; color: #888; border-top: 1px solid #eee; }
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $appName ?? 'NetOps Monitor' }}</h1>
        </div>
        <div class="content">
            <h2>{{ $title }}</h2>
            <p>{!! nl2br(e($messageText)) !!}</p>
            
            @if(!empty($details))
            <div class="box">
                @foreach($details as $key => $value)
                <div style="margin-bottom: 8px;"><strong>{{ $key }}:</strong> {{ $value }}</div>
                @endforeach
            </div>
            @endif

            @if(!empty($actionUrl))
            <div style="text-align: center; margin-top: 30px;">
                <a href="{{ $actionUrl }}" class="btn">{{ $actionText ?? 'View Details' }}</a>
            </div>
            @endif
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} {{ $appName ?? 'NetOps Monitor' }}. All rights reserved.
        </div>
    </div>
</body>
</html>
