@extends('setup.layout', ['step' => 1])

@section('content')
    <h1>System Requirements</h1>
    <p class="subtitle">Checking if your server meets the requirements.</p>

    <div style="margin-bottom: 24px; font-size: 14px;">
        @foreach($requirements as $name => $passed)
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                <span>{{ $name }}</span>
                @if($passed)
                    <span style="color: var(--success); font-weight: 600;">Passed</span>
                @else
                    <span style="color: var(--danger); font-weight: 600;">Failed</span>
                @endif
            </div>
        @endforeach
    </div>

    @if($allPassed)
        <a href="/setup/database" class="btn">Next: Database Setup</a>
    @else
        <div class="alert alert-danger">
            Please resolve the failed requirements above before continuing. You may need to install PHP extensions or fix file permissions.
        </div>
        <a href="/setup" class="btn" style="background-color: var(--border-color);">Retry Check</a>
    @endif
@endsection
