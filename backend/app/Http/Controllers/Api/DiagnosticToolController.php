<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;
use App\Models\Organization;
use Illuminate\Support\Facades\Validator;
use Exception;

class DiagnosticToolController extends Controller
{
    private function validateTarget(Request $request)
    {
        $validated = $request->validate([
            'target' => 'required|string|max:255',
        ]);
        
        $target = trim($validated['target']);
        $target = preg_replace('#^https?://#', '', $target);
        $target = explode('/', $target)[0];

        if (!filter_var($target, FILTER_VALIDATE_IP) && !preg_match('/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $target)) {
            abort(422, 'Invalid target format. Must be a valid domain or IP address.');
        }

        return $target;
    }

    private function checkAccess($toolName, $orgId)
    {
        if (!$orgId) return;
        $org = Organization::find($orgId);
        if ($org) {
            $features = $org->effective_features;
            if (!empty($features['allowed_tools']) && !in_array($toolName, $features['allowed_tools'])) {
                abort(403, "This tool ({$toolName}) is not included in your current plan. Please upgrade.");
            }
        }
    }

    public function ping(Request $request): JsonResponse
    {
        $this->checkAccess('ping', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $command = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? "ping -n 4 " . escapeshellarg($target) : "ping -c 4 " . escapeshellarg($target);
        
        exec($command . ' 2>&1', $output, $status);
        
        return response()->json([
            'target' => $target,
            'output' => implode("\n", $output),
            'success' => $status === 0
        ]);
    }

    public function traceroute(Request $request)
    {
        $this->checkAccess('traceroute', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $command = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') ? "tracert -d -h 15 " . escapeshellarg($target) : "traceroute -m 15 -n " . escapeshellarg($target);
        
        exec($command . ' 2>&1', $output, $status);
        
        return response()->json([
            'target' => $target,
            'output' => implode("\n", $output),
            'success' => $status === 0
        ]);
    }

    public function dns(Request $request)
    {
        $this->checkAccess('dns', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $types = [DNS_A, DNS_AAAA, DNS_CNAME, DNS_MX, DNS_TXT, DNS_NS];
        $results = [];
        
        foreach ($types as $type) {
            $records = @dns_get_record($target, $type);
            if ($records) {
                $results = array_merge($results, $records);
            }
        }
        
        return response()->json([
            'target' => $target,
            'records' => $results,
        ]);
    }

    public function port(Request $request)
    {
        $this->checkAccess('port', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $request->validate(['port' => 'required|integer|min:1|max:65535']);
        $port = $request->port;

        $fp = @fsockopen($target, $port, $errno, $errstr, 2);
        if ($fp) {
            fclose($fp);
            return response()->json(['target' => $target, 'port' => $port, 'status' => 'open']);
        }

        return response()->json(['target' => $target, 'port' => $port, 'status' => 'closed', 'error' => $errstr]);
    }

    public function whois(Request $request)
    {
        $this->checkAccess('whois', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $outputStr = '';
        $isWin = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN');

        if (!$isWin) {
            @exec("whois " . escapeshellarg($target) . " 2>&1", $output, $status);
            $outputStr = implode("\n", $output ?? []);
        }

        if (empty(trim($outputStr)) || str_contains($outputStr, 'not supported') || str_contains($outputStr, 'command not found')) {
            try {
                $response = Http::timeout(6)->get("https://rdap.org/domain/{$target}");
                if ($response->successful()) {
                    $rdap = $response->json();
                    $lines = [];
                    $lines[] = "Domain: " . ($rdap['ldhName'] ?? $target);
                    $lines[] = "Handle: " . ($rdap['handle'] ?? 'N/A');
                    if (!empty($rdap['status'])) {
                        $lines[] = "Status: " . implode(', ', (array) $rdap['status']);
                    }
                    if (!empty($rdap['events'])) {
                        foreach ($rdap['events'] as $evt) {
                            $lines[] = ucfirst($evt['eventAction'] ?? 'Event') . ": " . ($evt['eventDate'] ?? '');
                        }
                    }
                    if (!empty($rdap['nameservers'])) {
                        $nsList = array_map(fn($n) => $n['ldhName'] ?? '', $rdap['nameservers']);
                        $lines[] = "Name Servers: " . implode(', ', array_filter($nsList));
                    }
                    if (!empty($rdap['entities'])) {
                        foreach ($rdap['entities'] as $entity) {
                            $roles = implode(', ', (array) ($entity['roles'] ?? []));
                            $lines[] = "Entity ({$roles}): " . ($entity['handle'] ?? '');
                        }
                    }
                    $outputStr = implode("\n", $lines);
                } else {
                    $outputStr = "WHOIS/RDAP query for {$target}: No public registration records found or query limit reached.";
                }
            } catch (\Exception $e) {
                $outputStr = "WHOIS lookup completed for {$target}.";
            }
        }
        
        return response()->json([
            'target' => $target,
            'output' => $outputStr
        ]);
    }

    public function ipinfo(Request $request)
    {
        $this->checkAccess('ipinfo', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        // Ensure it's an IP
        if (!filter_var($target, FILTER_VALIDATE_IP)) {
            $target = gethostbyname($target);
        }

        try {
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$target}");
            return response()->json($response->json());
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch IP info.'], 500);
        }
    }

    public function ssl(Request $request)
    {
        $this->checkAccess('ssl', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        
        $context = stream_context_create([
            "ssl" => [
                "capture_peer_cert" => true,
                "verify_peer" => false,
                "verify_peer_name" => false,
            ]
        ]);

        try {
            $client = @stream_socket_client("ssl://{$target}:443", $errno, $errstr, 5, STREAM_CLIENT_CONNECT, $context);
            if (!$client) {
                return response()->json(['error' => "Could not connect to {$target} on port 443."], 400);
            }
            
            $params = stream_context_get_params($client);
            $certResource = $params["options"]["ssl"]["peer_certificate"];
            $certInfo = openssl_x509_parse($certResource);
            
            return response()->json([
                'target' => $target,
                'issuer' => $certInfo['issuer']['O'] ?? $certInfo['issuer']['CN'] ?? 'Unknown',
                'subject' => $certInfo['subject']['CN'] ?? 'Unknown',
                'valid_from' => date('Y-m-d H:i:s', $certInfo['validFrom_time_t']),
                'valid_to' => date('Y-m-d H:i:s', $certInfo['validTo_time_t']),
                'days_remaining' => floor(($certInfo['validTo_time_t'] - time()) / 86400),
                'extensions' => $certInfo['extensions'] ?? []
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Failed to fetch SSL certificate.'], 500);
        }
    }
    
    public function headers(Request $request)
    {
        $this->checkAccess('headers', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        try {
            $response = Http::timeout(5)->withOptions(['verify' => false])->head("https://{$target}");
            return response()->json([
                'target' => $target,
                'status' => $response->status(),
                'headers' => $response->headers(),
            ]);
        } catch (Exception $e) {
             try {
                 $response = Http::timeout(5)->head("http://{$target}");
                 return response()->json([
                    'target' => $target,
                    'status' => $response->status(),
                    'headers' => $response->headers(),
                 ]);
             } catch (Exception $e2) {
                 return response()->json(['error' => 'Failed to fetch headers.'], 500);
             }
        }
    }

    public function blacklist(Request $request)
    {
        $this->checkAccess('blacklist', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        if (!filter_var($target, FILTER_VALIDATE_IP)) {
            $target = gethostbyname($target);
        }
        
        $reverse_ip = implode('.', array_reverse(explode('.', $target)));
        $dnsbls = [
            'zen.spamhaus.org',
            'b.barracudacentral.org',
            'bl.spamcop.net',
            'cbl.abuseat.org',
            'dnsbl.sorbs.net'
        ];
        
        $results = [];
        $is_listed = false;
        
        foreach ($dnsbls as $dnsbl) {
            $lookup = $reverse_ip . '.' . $dnsbl;
            $record = @dns_get_record($lookup, DNS_A);
            $listed = !empty($record);
            if ($listed) $is_listed = true;
            
            $results[] = [
                'provider' => $dnsbl,
                'listed' => $listed,
                'details' => $listed ? $record[0]['ip'] : null
            ];
        }
        
        return response()->json([
            'target' => $target,
            'is_listed' => $is_listed,
            'results' => $results
        ]);
    }

    public function ipreputation(Request $request)
    {
        $this->checkAccess('ipreputation', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        if (!filter_var($target, FILTER_VALIDATE_IP)) {
            $target = gethostbyname($target);
        }

        $reverse_ip = implode('.', array_reverse(explode('.', $target)));
        $lists = [
            'dnsbl.dronebl.org' => 'Drone/Botnet',
            'bl.blocklist.de' => 'Blocklist.de',
            'all.s5h.net' => 'S5H',
            'bl.spamcop.net' => 'Spamcop',
            'xbl.spamhaus.org' => 'Spamhaus XBL'
        ];
        
        $score = 100;
        $detections = [];

        foreach ($lists as $dnsbl => $type) {
            $lookup = $reverse_ip . '.' . $dnsbl;
            $record = @dns_get_record($lookup, DNS_A);
            if (!empty($record)) {
                $score -= 20;
                $detections[] = [
                    'source' => $type,
                    'list' => $dnsbl,
                    'record' => $record[0]['ip']
                ];
            }
        }
        
        $score = max(0, $score);
        $status = $score > 80 ? 'Clean' : ($score > 40 ? 'Suspicious' : 'Malicious');

        return response()->json([
            'target' => $target,
            'score' => $score,
            'status' => $status,
            'detections' => $detections
        ]);
    }

    public function snmpTest(Request $request)
    {
        $this->checkAccess('snmp-test', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $version = $request->input('version', '2c');
        $community = $request->input('community', 'public');
        
        // Timeout
        $timeout = 5; 
        
        $args = ['snmpget', '-v', $version];
        if ($version === '3') {
            $user = $request->input('user', '');
            $auth = $request->input('auth_pass', '');
            $priv = $request->input('priv_pass', '');
            $secLevel = 'noAuthNoPriv';
            
            $args[] = '-u'; $args[] = $user;
            if (!empty($auth)) {
                $secLevel = empty($priv) ? 'authNoPriv' : 'authPriv';
                $args[] = '-a'; $args[] = 'SHA';
                $args[] = '-A'; $args[] = $auth;
            }
            if (!empty($priv)) {
                $args[] = '-x'; $args[] = 'AES';
                $args[] = '-X'; $args[] = $priv;
            }
            $args[] = '-l'; $args[] = $secLevel;
        } else {
            $args[] = '-c'; $args[] = $community;
        }
        
        $args = array_merge($args, [
            '-O', 'qv', '-t', (string)$timeout, '-r', '1', $target,
            '1.3.6.1.2.1.1.3.0', // sysUpTime
            '1.3.6.1.2.1.1.1.0'  // sysDescr
        ]);

        $process = new \Symfony\Component\Process\Process($args);
        
        $process->setTimeout($timeout + 5);
        $process->run();
        
        if (!$process->isSuccessful()) {
            return response()->json([
                'success' => false,
                'error' => 'SNMP error: ' . trim($process->getErrorOutput()),
                'target' => $target
            ], 400);
        }
        
        $output = explode("\n", trim($process->getOutput()));
        
        return response()->json([
            'success' => true,
            'target' => $target,
            'uptime' => $output[0] ?? 'Unknown',
            'description' => $output[1] ?? 'Unknown',
            'raw' => $process->getOutput()
        ]);
    }

    public function snmpRoutes(Request $request)
    {
        $this->checkAccess('snmp-routes', $request->attributes->get('org_id'));
        $target = $this->validateTarget($request);
        $version = $request->input('version', '2c');
        $community = $request->input('community', 'public');
        
        $args = ['snmpwalk', '-v', $version];
        if ($version === '3') {
            $user = $request->input('user', '');
            $auth = $request->input('auth_pass', '');
            $priv = $request->input('priv_pass', '');
            $args[] = '-u'; $args[] = $user;
            if ($auth) {
                $args[] = '-a'; $args[] = 'SHA';
                $args[] = '-A'; $args[] = $auth;
                $args[] = '-l'; $args[] = $priv ? 'authPriv' : 'authNoPriv';
            } else {
                $args[] = '-l'; $args[] = 'noAuthNoPriv';
            }
            if ($priv) {
                $args[] = '-x'; $args[] = 'AES';
                $args[] = '-X'; $args[] = $priv;
            }
        } else {
            $args[] = '-c'; $args[] = $community;
        }

        // ipRouteDest: 1.3.6.1.2.1.4.21.1.1
        // ipRouteNextHop: 1.3.6.1.2.1.4.21.1.7
        $proc = new \Symfony\Component\Process\Process(array_merge($args, [
            '-O', 'qn', '-t', '5', '-r', '0', $target, '1.3.6.1.2.1.4.21.1.7'
        ]));
        
        $proc->run();
        
        if (!$proc->isSuccessful()) {
            return response()->json(['error' => 'Failed to fetch routing table: ' . trim($proc->getErrorOutput())], 400);
        }

        $routes = [];
        foreach (explode("\n", trim($proc->getOutput())) as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            $parts = explode(' ', $line, 2);
            if (count($parts) === 2) {
                $oid = trim($parts[0], '.');
                $nextHop = trim($parts[1], '" ');
                $base = '1.3.6.1.2.1.4.21.1.7';
                if (str_starts_with($oid, $base . '.')) {
                    $dest = substr($oid, strlen($base) + 1);
                    $routes[] = ['destination' => $dest, 'next_hop' => $nextHop];
                }
            }
        }
        
        return response()->json(['routes' => $routes]);
    }

    public function networkDiscovery(Request $request)
    {
        $this->checkAccess('network-discovery', $request->attributes->get('org_id'));
        $validated = $request->validate([
            'seed_ip' => 'required|string',
            'community' => 'nullable|string',
            'version' => 'nullable|string'
        ]);
        
        $target = $validated['seed_ip'];
        // Remove protocol if present
        $target = preg_replace('#^https?://#', '', $target);
        $target = explode('/', $target)[0];
        if (!filter_var($target, FILTER_VALIDATE_IP)) {
            $target = gethostbyname($target);
        }

        $community = trim($validated['community'] ?? 'public');
        if (empty($community)) $community = 'public';
        $version = trim($validated['version'] ?? '2c');
        $args = ['snmpwalk', '-v', $version];
        $getArgs = ['snmpget', '-v', $version];
        
        if ($version === '3') {
            $user = $request->input('user', '');
            $auth = $request->input('auth_pass', '');
            $priv = $request->input('priv_pass', '');
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
            $args = array_merge($args, ['-c', $community]);
            $getArgs = array_merge($getArgs, ['-c', $community]);
        }
        
        $timeout = 60;
        
        // Walk the ipNetToMediaPhysAddress table (ARP cache)
        $proc = new \Symfony\Component\Process\Process(array_merge($args, [
            '-O', 'Qn', '-t', '2', '-r', '1', $target, '1.3.6.1.2.1.4.22.1.2'
        ]));
        $proc->setTimeout($timeout);
        $proc->run();
        
        if (!$proc->isSuccessful()) {
            return response()->json([
                'error' => 'Failed to connect to Seed Router or SNMP not configured.',
                'details' => trim($proc->getErrorOutput())
            ], 400);
        }
        
        $output = explode("\n", trim($proc->getOutput()));
        $discovered = [];
        $ips = [];
        
        foreach ($output as $line) {
            // Example line: .1.3.6.1.2.1.4.22.1.2.2.192.168.1.10 = "00:11:22:33:44:55"
            if (preg_match('/\.1\.3\.6\.1\.2\.1\.4\.22\.1\.2\.\d+\.([\d\.]+) = (.+)/', trim($line), $matches)) {
                $ip = $matches[1];
                $mac = trim($matches[2], " \t\n\r\0\x0B\"");
                if ($ip !== '127.0.0.1' && !in_array($ip, $ips)) {
                    $ips[] = $ip;
                    $discovered[] = [
                        'ip' => $ip,
                        'mac' => $mac,
                        'status' => 'Up',
                        'snmp_status' => 'Unknown',
                        'description' => null,
                        'community' => null
                    ];
                }
            }
        }
        
        if (empty($discovered)) {
            return response()->json([
                'seed_ip' => $target,
                'discovered' => []
            ]);
        }
        
        // Try to identify each discovered IP
        $deepScanLimit = min(count($discovered), 50);
        for ($i = 0; $i < $deepScanLimit; $i++) {
            $host = &$discovered[$i];
            $p = new \Symfony\Component\Process\Process(array_merge($getArgs, [
                '-O', 'qv', '-t', '1', '-r', '0', $host['ip'], '1.3.6.1.2.1.1.1.0'
            ]));
            $p->run();
            if ($p->isSuccessful()) {
                $host['snmp_status'] = 'Configured';
                $host['description'] = trim($p->getOutput());
                $host['community'] = ($version === '3') ? 'v3' : $community;
            }
        }
        
        return response()->json([
            'seed_ip' => $target,
            'discovered' => $discovered
        ]);
    }

    public function snmpInterfaceTraffic(Request $request)
    {
        $organization = $request->attributes->get('organization') 
            ?? Organization::find($request->attributes->get('org_id'));
        if ($organization) {
            $this->checkAccess('network-discovery', $organization->id);
        }

        $validator = Validator::make($request->all(), [
            'target' => 'required|ip',
            'version' => 'required|in:1,2c,3',
            'community' => 'required_if:version,1,2c|nullable|string|max:128',
            'interface_id' => 'required|integer|min:1',
            'user' => 'nullable|string|max:128',
            'auth_pass' => 'nullable|string|max:128',
            'priv_pass' => 'nullable|string|max:128',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $target = $request->input('target');
        $version = $request->input('version');
        $interfaceId = (int) $request->input('interface_id');

        $inOid = "1.3.6.1.2.1.2.2.1.10.{$interfaceId}";
        $outOid = "1.3.6.1.2.1.2.2.1.16.{$interfaceId}";

        $args = ['snmpget', '-v', $version];
        if ($version === '3') {
            $user = $request->input('user', '');
            $auth = $request->input('auth_pass', '');
            $priv = $request->input('priv_pass', '');
            $args[] = '-u'; $args[] = $user;
            if (!empty($auth)) {
                $args[] = '-a'; $args[] = 'SHA';
                $args[] = '-A'; $args[] = $auth;
                $args[] = '-l'; $args[] = empty($priv) ? 'authNoPriv' : 'authPriv';
            } else {
                $args[] = '-l'; $args[] = 'noAuthNoPriv';
            }
            if (!empty($priv)) {
                $args[] = '-x'; $args[] = 'AES';
                $args[] = '-X'; $args[] = $priv;
            }
        } else {
            $community = $request->input('community', 'public');
            $args[] = '-c'; $args[] = $community;
        }

        $args = array_merge($args, [
            '-O', 'qv', '-t', '5', '-r', '1', $target, $inOid, $outOid
        ]);

        $process = new \Symfony\Component\Process\Process($args);
        $process->setTimeout(10);
        $process->run();

        if (!$process->isSuccessful()) {
            $err = trim($process->getErrorOutput());
            if (stripos($err, 'Timeout') !== false || stripos($process->getOutput(), 'Timeout') !== false) {
                return response()->json(['success' => false, 'error' => 'SNMP Timeout'], 504);
            }
            return response()->json(['success' => false, 'error' => 'SNMP query failed'], 500);
        }

        $output = array_values(array_filter(array_map('trim', explode("\n", trim($process->getOutput()))), fn($l) => $l !== ''));
        $inBytes = isset($output[0]) && is_numeric($output[0]) ? (int)$output[0] : 0;
        $outBytes = isset($output[1]) && is_numeric($output[1]) ? (int)$output[1] : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'in_bytes' => $inBytes,
                'out_bytes' => $outBytes,
                'timestamp' => microtime(true)
            ]
        ]);
    }
}
