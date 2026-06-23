<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Models\Monitor;
use App\Models\User;
use Exception;

class ServerHealthController extends Controller
{
    public function index(): JsonResponse
    {
        $cpu = $this->getCpuUsage();
        $ram = $this->getRamUsage();
        $disk = $this->getDiskUsage();
        $app = $this->getAppMetrics();

        $suggestions = $this->generateSuggestions($cpu, $ram, $disk, $app);

        return response()->json([
            'cpu' => $cpu,
            'ram' => $ram,
            'disk' => $disk,
            'app' => $app,
            'suggestions' => $suggestions,
        ]);
    }

    private function getCpuUsage(): ?float
    {
        try {
            if (PHP_OS_FAMILY === 'Windows') {
                $cmd = 'powershell -NoProfile -Command "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average"';
                $output = shell_exec($cmd);
                return $output !== null ? (float) trim($output) : null;
            } else {
                $cmd = "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'";
                $output = shell_exec($cmd);
                if ($output !== null && is_numeric(trim($output))) {
                    return (float) trim($output);
                }
            }
        } catch (Exception $e) {}
        return null;
    }

    private function getRamUsage(): ?array
    {
        try {
            if (PHP_OS_FAMILY === 'Windows') {
                $cmd = 'powershell -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory, TotalVisibleMemorySize | ConvertTo-Json"';
                $output = shell_exec($cmd);
                if ($output) {
                    $data = json_decode($output, true);
                    if (isset($data['TotalVisibleMemorySize'], $data['FreePhysicalMemory'])) {
                        $total = (int) $data['TotalVisibleMemorySize'] * 1024;
                        $free = (int) $data['FreePhysicalMemory'] * 1024;
                        $used = $total - $free;
                        return [
                            'total' => $total,
                            'free' => $free,
                            'used' => $used,
                            'used_percentage' => $total > 0 ? round(($used / $total) * 100, 2) : 0,
                        ];
                    }
                }
            } else {
                $free = shell_exec('free -b');
                if ($free) {
                    preg_match('/Mem:\s+(\d+)\s+(\d+)\s+(\d+)/', $free, $matches);
                    if (count($matches) >= 4) {
                        $total = (int) $matches[1];
                        $used = (int) $matches[2];
                        return [
                            'total' => $total,
                            'free' => $total - $used,
                            'used' => $used,
                            'used_percentage' => $total > 0 ? round(($used / $total) * 100, 2) : 0,
                        ];
                    }
                }
            }
        } catch (Exception $e) {}

        return null;
    }

    private function getDiskUsage(): ?array
    {
        try {
            $path = PHP_OS_FAMILY === 'Windows' ? 'C:' : '/';
            $total = disk_total_space($path);
            $free = disk_free_space($path);
            if ($total !== false && $free !== false) {
                $used = $total - $free;
                return [
                    'total' => $total,
                    'free' => $free,
                    'used' => $used,
                    'used_percentage' => $total > 0 ? round(($used / $total) * 100, 2) : 0,
                ];
            }
        } catch (Exception $e) {}
        return null;
    }

    private function getAppMetrics(): array
    {
        $dbSize = 0;
        try {
            if (config('database.default') === 'sqlite') {
                $path = config('database.connections.sqlite.database');
                if (file_exists($path)) {
                    $dbSize = filesize($path);
                }
            }
        } catch (Exception $e) {}

        $pendingJobs = 0;
        $failedJobs = 0;
        try {
            if (config('queue.default') === 'database') {
                $pendingJobs = DB::table('jobs')->count();
                $failedJobs = DB::table('failed_jobs')->count();
            }
        } catch (Exception $e) {}

        return [
            'total_users' => User::count(),
            'total_monitors' => Monitor::count(),
            'active_monitors' => Monitor::where('status', 'active')->count(),
            'failed_jobs' => $failedJobs,
            'pending_jobs' => $pendingJobs,
            'database_size_bytes' => $dbSize,
        ];
    }

    private function generateSuggestions(?float $cpu, ?array $ram, ?array $disk, array $app): array
    {
        $suggestions = [];

        if ($cpu !== null && $cpu > 85) {
            $suggestions[] = "High CPU utilization (" . round($cpu, 1) . "%). Consider scaling up your server or optimizing background jobs.";
        }
        
        if ($ram !== null && $ram['used_percentage'] > 85) {
            $suggestions[] = "High RAM utilization ({$ram['used_percentage']}%). Your server may start swapping and slow down operations.";
        }

        if ($disk !== null && $disk['used_percentage'] > 90) {
            $suggestions[] = "Critically low disk space. Only " . round($disk['free'] / 1024 / 1024 / 1024, 2) . "GB remaining. Clean up old logs or expand storage immediately.";
        }

        if ($app['failed_jobs'] > 0) {
            $suggestions[] = "You have {$app['failed_jobs']} failed queue jobs. Check the global logs and 'php artisan queue:failed'.";
        }

        if ($app['pending_jobs'] > 1000) {
            $suggestions[] = "Queue is backed up with {$app['pending_jobs']} pending jobs. Consider increasing the number of queue workers.";
        }

        if ($app['database_size_bytes'] > 1024 * 1024 * 1024) { // 1GB
            $suggestions[] = "Database size is over 1GB. Consider archiving old incident logs and metrics.";
        }

        if (empty($suggestions)) {
            $suggestions[] = "System is running perfectly. No actions required at the moment.";
        }

        return $suggestions;
    }
}
