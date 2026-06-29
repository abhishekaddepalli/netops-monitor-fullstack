<?php
$target = '117.240.120.220'; // Ether7-BSNL IP in screenshot
$community = 'public';

echo "Testing SNMP on $target...\n";

$oids = [
    '1.3.6.1.2.1.25.3.3.1.2',
    '1.3.6.1.4.1.14988.1.1.3.10',
    '1.3.6.1.4.1.14988.1.1.18.1.1.2',
    '1.3.6.1.2.1.25.2.3.1'
];

foreach ($oids as $oid) {
    echo "\nWalking $oid:\n";
    $cmd = "snmpwalk -v2c -c $community -O qv -t 2 -r 1 $target $oid 2>&1";
    exec($cmd, $out);
    echo implode("\n", $out) . "\n";
    $out = [];
}

foreach ($oids as $oid) {
    echo "\nWalking $oid:\n";
    $cmd = "snmpwalk -v2c -c $community -O qv -t 2 -r 1 $target $oid 2>&1";
    exec($cmd, $out);
    echo implode("\n", $out) . "\n";
    $out = [];
}
