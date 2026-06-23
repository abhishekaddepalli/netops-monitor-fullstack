<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Organization;

class SetupController extends Controller
{
    public function requirements()
    {
        $requirements = [
            'PHP Version (>= 8.2)' => version_compare(PHP_VERSION, '8.2.0', '>='),
            'PDO Extension' => extension_loaded('pdo'),
            'OpenSSL Extension' => extension_loaded('openssl'),
            'Mbstring Extension' => extension_loaded('mbstring'),
            'cURL Extension' => extension_loaded('curl'),
            'Storage Directory Writable' => is_writable(storage_path()),
            'Bootstrap Cache Writable' => is_writable(base_path('bootstrap/cache')),
            '.env File Writable' => is_writable(base_path('.env')),
        ];

        $allPassed = !in_array(false, $requirements, true);

        return view('setup.requirements', compact('requirements', 'allPassed'));
    }

    public function database()
    {
        return view('setup.database');
    }

    public function saveDatabase(Request $request)
    {
        $request->validate([
            'db_host' => 'required',
            'db_port' => 'required|numeric',
            'db_database' => 'required',
            'db_username' => 'required',
            'db_password' => 'nullable',
        ]);

        // Test connection dynamically
        config([
            'database.connections.setup_test' => [
                'driver' => 'mysql',
                'host' => $request->db_host,
                'port' => $request->db_port,
                'database' => $request->db_database,
                'username' => $request->db_username,
                'password' => $request->db_password,
            ]
        ]);

        try {
            DB::connection('setup_test')->getPdo();
        } catch (\Exception $e) {
            return back()->withInput()->with('error', 'Could not connect to database: ' . $e->getMessage());
        }

        // Write to .env
        $this->updateEnv([
            'DB_HOST' => $request->db_host,
            'DB_PORT' => $request->db_port,
            'DB_DATABASE' => $request->db_database,
            'DB_USERNAME' => $request->db_username,
            'DB_PASSWORD' => $request->db_password,
        ]);

        return redirect('/setup/admin');
    }

    public function admin()
    {
        // Run migrations before showing the form to ensure tables exist
        try {
            Artisan::call('migrate', ['--force' => true]);
        } catch (\Exception $e) {
            return redirect('/setup/database')->with('error', 'Database connection was lost or migration failed: ' . $e->getMessage());
        }

        return view('setup.admin');
    }

    public function saveAdmin(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $org = Organization::create([
            'name' => 'Default Organization',
            'slug' => 'default',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'organization_id' => $org->id,
            'system_role' => 'super_admin',
        ]);

        $org->users()->attach($user->id, [
            'role' => 'org_admin',
            'joined_at' => now(),
        ]);

        return redirect('/setup/finish');
    }

    public function finish()
    {
        // Create the installed lock file
        File::put(storage_path('installed'), json_encode([
            'date' => now()->toDateTimeString(),
        ]));

        return view('setup.finish');
    }

    private function updateEnv(array $data)
    {
        $envPath = base_path('.env');
        if (!file_exists($envPath)) {
            return;
        }

        $envFile = file_get_contents($envPath);

        foreach ($data as $key => $value) {
            $value = preg_replace('/\s+/', '', $value); // Remove spaces
            if (preg_match("/^{$key}=/m", $envFile)) {
                $envFile = preg_replace("/^{$key}=.*/m", "{$key}={$value}", $envFile);
            } else {
                $envFile .= "\n{$key}={$value}";
            }
        }

        file_put_contents($envPath, $envFile);
    }
}
