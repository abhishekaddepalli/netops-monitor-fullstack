<?php

return [
    'domain' => env('HORIZON_DOMAIN'),
    'path' => env('HORIZON_PATH', 'horizon'),
    'use' => 'default',
    'prefix' => env('HORIZON_PREFIX', 'horizon:'),
    'middleware' => ['web', 'auth:sanctum', 'org.role:super_admin'],
    'waits' => [
        'redis:monitor-checks-fast' => 10,
        'redis:monitor-checks' => 30,
        'redis:alerts' => 30,
        'redis:default' => 60,
    ],
    'trim' => [
        'recent' => 60,
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080,
        'failed' => 10080,
        'monitored' => 10080,
    ],
    'silenced' => [],
    'metrics' => ['trim_snapshots' => ['job' => 24, 'queue' => 24]],
    'fast_termination' => false,
    'memory_limit' => 128,

    /*
    | Three supervisor pools matching config/monitoring.php's two job
    | queues plus alert delivery — each independently scalable. The
    | "fast" pool gets the most processes since 30s/1min-interval
    | monitors are the most latency-sensitive workload in the system.
    */
    'environments' => [
        'production' => [
            'supervisor-checks-fast' => [
                'connection' => 'redis',
                'queue' => ['monitor-checks-fast'],
                'balance' => 'auto',
                'minProcesses' => 2,
                'maxProcesses' => 20,
                'balanceMaxShift' => 2,
                'balanceCooldown' => 3,
                'tries' => 2,
                'timeout' => 65,
            ],
            'supervisor-checks-standard' => [
                'connection' => 'redis',
                'queue' => ['monitor-checks'],
                'balance' => 'auto',
                'minProcesses' => 2,
                'maxProcesses' => 15,
                'tries' => 2,
                'timeout' => 65,
            ],
            'supervisor-alerts' => [
                'connection' => 'redis',
                'queue' => ['alerts'],
                'balance' => 'simple',
                'minProcesses' => 1,
                'maxProcesses' => 5,
                'tries' => 3,
                'timeout' => 30,
            ],
            'supervisor-default' => [
                'connection' => 'redis',
                'queue' => ['default'],
                'balance' => 'simple',
                'minProcesses' => 1,
                'maxProcesses' => 3,
            ],
        ],

        'local' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['monitor-checks-fast', 'monitor-checks', 'alerts', 'default'],
                'balance' => 'simple',
                'processes' => 3,
                'tries' => 2,
            ],
        ],
    ],
];
