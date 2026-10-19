<?php

namespace App\Services\Monitors;

use App\Models\Monitor;
use Symfony\Component\Process\Process;

class SnmpChecker implements MonitorCheckerInterface
{
    private function walkColumn(array $baseArgs, string $target, string $baseOid): array
    {
        $proc = new Process(array_merge($baseArgs, [
            '-O', 'qn', '-t', '1', '-r', '0', $target, $baseOid
        ]));
        $proc->run();
        $result = [];
        if ($proc->isSuccessful()) {
            foreach (explode("\n", trim($proc->getOutput())) as $line) {
                $line = trim($line);
                if (empty($line)) continue;
                $parts = explode(' ', $line, 2);
                if (count($parts) === 2) {
                    $oid = trim($parts[0], '.');
                    $baseClean = trim($baseOid, '.');
                    if (str_starts_with($oid, $baseClean . '.')) {
                        $idx = substr($oid, strlen($baseClean) + 1);
                        $result[$idx] = trim($parts[1], '" ');
                    }
                }
            }
        }
        return $result;
    }

    private function parseUptime(string $uptime): string
    {
        $parts = explode(':', preg_replace('/\.\d+$/', '', trim($uptime, '" ')));
        if (count($parts) === 4) {
            return "{$parts[0]}d {$parts[1]}h {$parts[2]}m {$parts[3]}s";
        } elseif (count($parts) === 3) {
            return "{$parts[0]}h {$parts[1]}m {$parts[2]}s";
        }
        return $uptime;
    }

    public function check(Monitor $monitor): CheckResult
    {
        $config = $monitor->config ?? [];
        $community = $config['community'] ?? 'public';
        $version = $config['version'] ?? '2c';
        $user = $config['user'] ?? '';
        $authPass = $config['auth_pass'] ?? '';
        $privPass = $config['priv_pass'] ?? '';
        $target = $monitor->target;
        
        $timeout = $monitor->timeout_seconds ?? config('monitoring.default_timeout_seconds', 10);
        
        $args = ['snmpget', '-v', $version];
        if ($version === '3') {
            $secLevel = 'noAuthNoPriv';
            $args[] = '-u'; $args[] = $user;
            if (!empty($authPass)) {
                $secLevel = empty($privPass) ? 'authNoPriv' : 'authPriv';
                $args[] = '-a'; $args[] = 'SHA';
                $args[] = '-A'; $args[] = $authPass;
            }
            if (!empty($privPass)) {
                $args[] = '-x'; $args[] = 'AES';
                $args[] = '-X'; $args[] = $privPass;
            }
            $args[] = '-l'; $args[] = $secLevel;
        } else {
            $args[] = '-c'; $args[] = $community;
        }
        
        $baseArgs = $args;
        $start = microtime(true);
        
        $process = new Process(array_merge($args, [
            '-O', 'qv', '-t', (string)$timeout, '-r', '1', $target, '1.3.6.1.2.1.1.3.0'
        ]));
        $process->setTimeout($timeout + 5);
        
        try {
            $process->run();
        } catch (\Symfony\Component\Process\Exception\ProcessTimedOutException $e) {
            return CheckResult::down("SNMP request timed out after {$timeout} seconds.", null, null);
        } catch (\Exception $e) {
            return CheckResult::down("SNMP error: " . $e->getMessage(), null, null);
        }

        $durationMs = (int) round((microtime(true) - $start) * 1000);

        if (!$process->isSuccessful()) {
            $errorOutput = trim($process->getErrorOutput());
            if (empty($errorOutput)) {
                $errorOutput = trim($process->getOutput());
            }
            if (stripos($errorOutput, 'Timeout') !== false) {
                $errorOutput = "SNMP request timed out.";
            }
            return CheckResult::down(
                'SNMP error: ' . $errorOutput,
                null,
                $durationMs,
                ['output' => $process->getOutput()]
            );
        }

        $output = $this->parseUptime($process->getOutput());
        
        // Fetch interfaces and IPs
        $walkArgs = array_merge(['snmpwalk', '-v', $version], $version === '3' ? array_slice($args, 3) : ['-c', $community]);
        
        $ifNames = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.2.2.1.2');
        $ifAdminStatus = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.2.2.1.7');
        $ifOperStatus = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.2.2.1.8');
        $ifIn = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.2.2.1.10');
        $ifOut = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.2.2.1.16');
        $ipAdIfIdx = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.4.20.1.2');

        $ifaceIps = [];
        foreach ($ipAdIfIdx as $ip => $idx) {
            $ifaceIps[$idx][] = $ip;
        }

        $interfaces = [];
        foreach ($ifNames as $idx => $name) {
            $admin = isset($ifAdminStatus[$idx]) ? $ifAdminStatus[$idx] : '1';
            $oper = isset($ifOperStatus[$idx]) ? $ifOperStatus[$idx] : '2';
            
            $status = ($oper == '1') ? 'UP' : 'DOWN';
            $isExpectedUp = ($admin == '1');
            
            $interfaces[] = [
                'name' => $name,
                'status' => $status,
                'expected_up' => $isExpectedUp,
                'in_octets' => $ifIn[$idx] ?? 0,
                'out_octets' => $ifOut[$idx] ?? 0,
                'ips' => $ifaceIps[$idx] ?? []
            ];
        }
        
        // Fetch sysName and sysDescr
        $sysInfoProc = new Process(array_merge($baseArgs, [
            '-O', 'qv', '-t', '2', '-r', '1', $target,
            '1.3.6.1.2.1.1.5.0', // sysName
            '1.3.6.1.2.1.1.1.0'  // sysDescr
        ]));
        $sysInfoProc->run();
        $sysName = ''; $sysDescr = '';
        if ($sysInfoProc->isSuccessful()) {
            $vals = explode("\n", trim($sysInfoProc->getOutput()));
            if (count($vals) >= 2) {
                $sysName = trim($vals[0], '"');
                $sysDescr = trim($vals[1], '"');
            }
        }
        
        $cpu_usage = 0; $ram_usage = 0; $disk_usage = 0;
        
        // Try UCD-SNMP-MIB first (Linux servers)
        $metricProc = new Process(array_merge($baseArgs, [
            '-O', 'qv', '-t', '1', '-r', '0', $target,
            '1.3.6.1.4.1.2021.11.11.0', // ssCpuIdle
            '1.3.6.1.4.1.2021.4.5.0',   // memTotalReal
            '1.3.6.1.4.1.2021.4.6.0',   // memAvailReal
            '1.3.6.1.4.1.2021.9.1.9.1'  // dskPercent.1
        ]));
        $metricProc->run();
        
        $ucdSuccess = false;
        if ($metricProc->isSuccessful()) {
            $vals = explode("\n", trim($metricProc->getOutput()));
            if (count($vals) >= 3 && is_numeric($vals[0]) && is_numeric($vals[1]) && is_numeric($vals[2]) && $vals[1] > 0) {
                $idle = (float)$vals[0];
                $total = (float)$vals[1];
                $avail = (float)$vals[2];
                $cpu_usage = max(0, min(100, 100 - $idle));
                $ram_usage = max(0, min(100, (($total - $avail) / $total) * 100));
                $disk_usage = isset($vals[3]) && is_numeric($vals[3]) ? (float)$vals[3] : 0;
                $ucdSuccess = true;
            }
        }
        
        // Fallback to HOST-RESOURCES-MIB (Mikrotik, Windows, standard routers)
        if (!$ucdSuccess) {
            // CPU Load (Average of hrProcessorLoad)
            $hrCpu = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.25.3.3.1.2');
            if (count($hrCpu) > 0) {
                $cpu_usage = array_sum($hrCpu) / count($hrCpu);
            } else {
                // Mikrotik specific CPU load OIDs
                $mtikCpu = $this->walkColumn($walkArgs, $target, '1.3.6.1.4.1.14988.1.1.3.10');
                if (count($mtikCpu) > 0) {
                    $cpu_usage = array_sum($mtikCpu) / count($mtikCpu);
                } else {
                    $mtikCore = $this->walkColumn($walkArgs, $target, '1.3.6.1.4.1.14988.1.1.18.1.1.2');
                    if (count($mtikCore) > 0) {
                        $cpu_usage = array_sum($mtikCore) / count($mtikCore);
                    }
                }
            }
            
            // Storage (hrStorageTable)
            // .2 = hrStorageType, .5 = hrStorageSize, .6 = hrStorageUsed
            $hrStorageType = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.25.2.3.1.2');
            $hrStorageSize = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.25.2.3.1.5');
            $hrStorageUsed = $this->walkColumn($walkArgs, $target, '1.3.6.1.2.1.25.2.3.1.6');
            
            foreach ($hrStorageType as $idx => $typeOid) {
                // hrStorageRam = .1.3.6.1.2.1.25.2.1.2
                if (strpos($typeOid, '25.2.1.2') !== false || strpos($typeOid, 'hrStorageRam') !== false) {
                    if (isset($hrStorageSize[$idx]) && $hrStorageSize[$idx] > 0 && isset($hrStorageUsed[$idx])) {
                        $ram_usage = ($hrStorageUsed[$idx] / $hrStorageSize[$idx]) * 100;
                    }
                }
                // Match FixedDisk (.4) or Other (.1) or Flash (.5)
                else if (strpos($typeOid, '25.2.1.4') !== false || strpos($typeOid, 'hrStorageFixedDisk') !== false || 
                         strpos($typeOid, '25.2.1.1') !== false || strpos($typeOid, 'hrStorageOther') !== false ||
                         strpos($typeOid, '25.2.1.5') !== false || strpos($typeOid, 'hrStorageFlashMemory') !== false) {
                    if (isset($hrStorageSize[$idx]) && $hrStorageSize[$idx] > 0 && isset($hrStorageUsed[$idx]) && $disk_usage === 0) {
                        $disk_usage = ($hrStorageUsed[$idx] / $hrStorageSize[$idx]) * 100;
                    }
                }
            }
        }
        
        if (count($interfaces) > 0 || $cpu_usage > 0) {
            $sysInfo = [];
            if (!empty($sysName)) $sysInfo['sysName'] = $sysName;
            if (!empty($sysDescr)) $sysInfo['sysDescr'] = $sysDescr;
            
            // We can inject sysInfo as a special interface entry so we don't need a DB migration right now
            if (!empty($sysInfo)) {
                $interfaces[] = [
                    'name' => '__sys_info__',
                    'sysName' => $sysName,
                    'sysDescr' => $sysDescr,
                ];
            }
            
            \App\Models\ServerMetric::create([
                'monitor_id' => $monitor->id,
                'cpu_usage_pct' => $cpu_usage,
                'ram_usage_pct' => $ram_usage,
                'disk_usage_pct' => $disk_usage,
                'interfaces' => $interfaces,
            ]);
        }
        
        // Mikrotik Health
        $healthProc = new Process(array_merge($baseArgs, [
            '-O', 'qv', '-t', '1', '-r', '0', $target, '1.3.6.1.4.1.14988.1.1.3.14.0'
        ]));
        $healthProc->run();
        $boardTemp = null;
        if ($healthProc->isSuccessful() && trim($healthProc->getOutput()) !== 'No Such Object available on this agent at this OID') {
            $val = (int) trim($healthProc->getOutput(), " \t\n\r\0\x0B\"");
            if ($val > 0) {
                $boardTemp = $val / 10; // e.g. 3492 -> 349.2 (or maybe it is in decidegrees -> 34.9 C? Mikrotik usually uses 1/10 C)
                if ($boardTemp > 100) $boardTemp = $boardTemp / 10; // handle 349.2 -> 34.92 C
            }
        }
        
        $alertReasons = [];
        
        // Alert on CPU/RAM/Disk thresholds
        if ($cpu_usage > 80) {
            $alertReasons[] = "CPU usage is high (" . round($cpu_usage, 2) . "%)";
        }
        if ($ram_usage > 80) {
            $alertReasons[] = "RAM usage is high (" . round($ram_usage, 2) . "%)";
        }
        if ($disk_usage > 80) {
            $alertReasons[] = "Disk usage is high (" . round($disk_usage, 2) . "%)";
        }
        
        // Check if there's a specific list of interfaces to monitor
        $config = is_string($monitor->config) ? json_decode($monitor->config, true) : $monitor->config;
        $monitoredInterfaces = $config['monitored_interfaces'] ?? null;
        
        // Alert on interface state changes (Admin UP but Oper DOWN)
        $downInterfaces = [];
        foreach ($interfaces as $iface) {
            if ($iface['name'] === '__sys_info__') continue;
            
            // If explicit monitored_interfaces array is set, ONLY alert on those
            if (is_array($monitoredInterfaces) && !in_array($iface['name'], $monitoredInterfaces)) {
                continue;
            }
            
            if (($iface['expected_up'] ?? false) && $iface['status'] === 'DOWN') {
                // Ignore loopbacks or null interfaces
                if (stripos($iface['name'], 'loopback') === false && stripos($iface['name'], 'null') === false) {
                    $downInterfaces[] = $iface['name'];
                }
            }
        }
        
        if (count($downInterfaces) > 0) {
            $alertReasons[] = "Interfaces expected UP but are DOWN: " . implode(', ', $downInterfaces);
        }

        if (!empty($alertReasons)) {
            return CheckResult::down("Threshold Alert: " . implode(', ', $alertReasons), 500, $durationMs);
        }

        return CheckResult::up(
            $durationMs,
            200,
            [
                'cpu_usage_pct' => $cpu_usage,
                'ram_usage_pct' => $ram_usage,
                'disk_usage_pct' => $disk_usage,
                'uptime' => $output, 
                'sysName' => $sysName, 
                'sysDescr' => $sysDescr,
                'boardTemp' => $boardTemp,
                'interfaces' => $interfaces
            ]
        );
    }
}
