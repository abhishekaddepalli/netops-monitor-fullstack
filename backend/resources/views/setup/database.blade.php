@extends('setup.layout', ['step' => 2])

@section('content')
    <h1>Database Configuration</h1>
    <p class="subtitle">Enter your MySQL database credentials. We will update the .env file automatically.</p>

    <form method="POST" action="/setup/database">
        @csrf
        <div class="form-group">
            <label>Database Host</label>
            <input type="text" name="db_host" value="{{ old('db_host', '127.0.0.1') }}" required>
        </div>
        <div class="form-group">
            <label>Database Port</label>
            <input type="text" name="db_port" value="{{ old('db_port', '3306') }}" required>
        </div>
        <div class="form-group">
            <label>Database Name</label>
            <input type="text" name="db_database" value="{{ old('db_database', 'netops_monitor') }}" required>
        </div>
        <div class="form-group">
            <label>Database Username</label>
            <input type="text" name="db_username" value="{{ old('db_username', 'root') }}" required>
        </div>
        <div class="form-group">
            <label>Database Password</label>
            <input type="password" name="db_password" value="{{ old('db_password') }}">
        </div>

        <button type="submit" class="btn">Connect & Continue</button>
    </form>
@endsection
