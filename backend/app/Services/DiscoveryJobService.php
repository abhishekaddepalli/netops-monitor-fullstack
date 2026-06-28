<?php

namespace App\Services;

use App\Models\DiscoveryJob;
use App\Models\Monitor;
use Symfony\Component\Process\Process;
use Illuminate\Support\Facades\Log;

class DiscoveryJobService
{
    public function runJob(DiscoveryJob $job)
    {
        Log::info("Running Discovery Job {$job->id} for Org {$job->organization_id} on seed IP {$job->seed_ip}");
        
        $target = preg_replace('#^https?://#', '', $job->seed_ip);
        $target = explode('/', $target)[0];
        if (!filter_var($target, FILTER_VALIDATE_IP)) {
            $target = gethostbyname($target);
        }

        $args = ['snmpwalk', '-v', $job->snmp_version];
        $getArgs = ['snmpget', '-v', $job->snmp_version];
        
        if ($job->snmp_version === '3') {
            $user = $job->user ?? '';
            $auth = $job->auth_pass ?? '';
            $priv = $job->priv_pass ?? '';
            $secLevel = 'noAuthNoPriv';
            
            $v3Args = ['-u', $user];
            if (!empty($auth)) {
                $secLevel = empty($priv) ? 'authNoPriv' : 'authPriv';
                $v3Args = array_merge($v3Args, ['-a', 'SHA', '-A', $auth]);
            }
            if (!empty($priv)) {
                $v3Args = array_merge($v3Args, ['-x', 'AES', '-X', $priv]);
            }
            $v3Args = array_merge($v3Args, ['-l', $secLevel]);
            
            $args = array_merge($args, $v3Args);
            $getArgs = array_merge($getArgs, $v3Args);
        } else {
            $community = empty($job->community) ? 'public' : trim($job->community);
            $args = array_merge($args, ['-c', $community]);
            $getArgs = array_merge($getArgs, ['-c', $community]);
        }
        
        // 1. Fetch ARP table
        $proc = new Process(array_merge($args, [
            '-O', 'Qn', '-t', '2', '-r', '1', $target, '1.3.6.1.2.1.4.22.1.2'
        ]));
        $proc->setTimeout(60);
        $proc->run();
        
        if (!$proc->isSuccessful()) {
            Log::warning("Discovery Job {$job->id} failed: " . trim($proc->getErrorOutput()));
            return;
        }
        
        $output = explode("\n", trim($proc->getOutput()));
        $ips = [];
        
        foreach ($output as $line) {
            if (preg_match('/\.1\.3\.6\.1\.2\.1\.4\.22\.1\.2\.\d+\.([\d\.]+) = (.+)/', trim($line), $matches)) {
                $ip = $matches[1];
                if (!in_array($ip, $ips)) {
                    $ips[] = $ip;
                }
            }
        }
        
        Log::info("Discovery Job {$job->id} found " . count($ips) . " IPs in ARP table.");
        
        // 2. Iterate IPs, check if monitor exists
        $existingTargets = Monitor::where('organization_id', $job->organization_id)->pluck('target')->toArray();
        $newMonitorsAdded = 0;

        foreach ($ips as $ip) {
            if (in_array($ip, $existingTargets)) {
                continue; // Already monitored
            }
            
            // Wait to avoid flooding the network
            usleep(100000); 

            // Try SNMP
            $snmpProc = new Process(array_merge($getArgs, [
                '-O', 'qv', '-t', '2', '-r', '0', $ip, '1.3.6.1.2.1.1.5.0' // sysName
            ]));
            $snmpProc->setTimeout(3);
            $snmpProc->run();
            
            $name = "Auto-{$ip}";
            $type = 'ping';
            $config = [];
            
            if ($snmpProc->isSuccessful() && trim($snmpProc->getOutput()) !== '') {
                $sysName = trim($snmpProc->getOutput(), " \t\n\r\0\x0B\"");
                if ($sysName && $sysName !== 'No Such Object available on this agent at this OID') {
                    $name = mb_substr($sysName, 0, 30);
                }
                $type = 'snmp';
                $config = [
                    'version' => $job->snmp_version,
                    'community' => $job->snmp_version !== '3' ? $job->community : null,
                    'user' => $job->snmp_version === '3' ? $job->user : null,
                    'auth_pass' => $job->snmp_version === '3' ? $job->auth_pass : null,
                    'priv_pass' => $job->snmp_version === '3' ? $job->priv_pass : null,
                ];
            }
            
            // Create Monitor
            Monitor::create([
                'organization_id' => $job->organization_id,
                'name' => $name,
                'type' => $type,
                'target' => $ip,
                'check_interval_seconds' => 60,
                'config' => $config,
                'status' => 'pending',
                'is_paused' => false,
            ]);
            
            $existingTargets[] = $ip;
            $newMonitorsAdded++;
        }
        
        $job->last_run_at = now();
        $job->save();
        
        Log::info("Discovery Job {$job->id} finished. Added {$newMonitorsAdded} new monitors.");
    }
}
