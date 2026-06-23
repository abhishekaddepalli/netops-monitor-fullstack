@extends('setup.layout', ['step' => 4])

@section('content')
    <div style="text-align: center; margin-bottom: 24px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <h1>Installation Complete!</h1>
        <p class="subtitle" style="margin-bottom: 0;">NetOps Monitor has been successfully installed.</p>
    </div>

    <div style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <label style="color: var(--text-main); margin-bottom: 10px;">Important: Set up Cron Job</label>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 0;">For the monitors to run automatically, you must add the following cron job to your server (running every minute):</p>
        
        <code style="display: block; background: #000; padding: 12px; border-radius: 4px; font-size: 12px; color: var(--success); word-break: break-all;">
            * * * * * cd {{ base_path() }} && php artisan schedule:run >> /dev/null 2>&1
        </code>
    </div>

    <a href="/" class="btn">Go to Dashboard</a>
@endsection
