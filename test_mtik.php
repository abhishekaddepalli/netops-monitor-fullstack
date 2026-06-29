<?php
$target = '117.240.120.220';
$community = 'public';

$oids = [
    '1.3.6.1.4.1.14988.1.1.5.1', // total memory
    '1.3.6.1.4.1.14988.1.1.5.2', // free memory
    '1.3.6.1.4.1.14988.1.1.5.5', // total hdd
    '1.3.6.1.4.1.14988.1.1.5.6', // free hdd
    '1.3.6.1.2.1.25.3.3.1.2' // hrProcessorLoad
];

foreach ($oids as $oid) {
    echo "\nWalking $oid:\n";
    exec("snmpwalk -v2c -c $community -O qv -t 2 -r 1 $target $oid 2>&1", $out);
    echo implode("\n", $out) . "\n";
    $out = [];
}
