<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$target = $argv[1] ?? '183.164.208.174';
echo "Testing Ping to: $target\n";

$process = new \Symfony\Component\Process\Process([
    'ping', '-n', '-c', '4', '-W', '10', $target
]);
$process->setTimeout(45);

try {
    $process->run();
} catch (\Exception $e) {
    echo "Process exception: " . $e->getMessage() . "\n";
}

$output = $process->getOutput();
echo "--- RAW OUTPUT ---\n";
echo $output . "\n";
echo "--- END RAW OUTPUT ---\n\n";

$stats = null;
if (preg_match('/(\d+) packets transmitted, (\d+) received,?.*?(\d+(?:\.\d+)?)% packet loss/', $output, $m)) {
    $packetLoss = (float) $m[3];
    $minLatency = $avgLatency = $maxLatency = $jitter = null;
    
    if (preg_match('/[=\s]([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/', $output, $rtt)) {
        $minLatency = (float) $rtt[1];
        $avgLatency = (float) $rtt[2];
        $maxLatency = (float) $rtt[3];
        $jitter = (float) $rtt[4];
    }
    
    $stats = [
        'packet_loss_pct' => $packetLoss,
        'min_latency_ms' => $minLatency !== null ? round($minLatency, 2) : null,
        'avg_latency_ms' => $avgLatency !== null ? (int) round($avgLatency) : null,
        'max_latency_ms' => $maxLatency !== null ? round($maxLatency, 2) : null,
        'jitter_ms' => $jitter !== null ? round($jitter, 2) : null,
    ];
}

echo "--- PARSED STATS ---\n";
print_r($stats);
echo "--- END PARSED STATS ---\n";

if ($stats === null) {
    echo "RESULT: DOWN (Host unreachable or ping timed out)\n";
} elseif ($stats['packet_loss_pct'] >= 100) {
    echo "RESULT: DOWN (100% packet loss)\n";
} elseif ($stats['packet_loss_pct'] > 20) {
    echo "RESULT: DEGRADED\n";
} else {
    echo "RESULT: UP\n";
}
