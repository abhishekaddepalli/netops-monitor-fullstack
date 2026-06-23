@extends('setup.layout', ['step' => 3])

@section('content')
    <div class="alert alert-success" style="margin-bottom: 24px;">
        Database connected and migrations ran successfully!
    </div>

    <h1>Create Admin Account</h1>
    <p class="subtitle">Set up the global administrator account for your application.</p>

    <form method="POST" action="/setup/admin">
        @csrf
        <div class="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value="{{ old('name') }}" required>
        </div>
        <div class="form-group">
            <label>Email Address</label>
            <input type="email" name="email" value="{{ old('email') }}" required>
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required minlength="8">
        </div>
        <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" name="password_confirmation" required>
        </div>

        <button type="submit" class="btn">Create Admin & Finish</button>
    </form>
@endsection
