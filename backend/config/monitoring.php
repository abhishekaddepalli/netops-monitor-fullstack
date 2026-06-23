<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Allowed check intervals (seconds)
    |--------------------------------------------------------------------------
    | Matches the spec exactly: 30s, 1m, 3m, 5m, 10m, 15m.
    | Plans restrict the *minimum* interval a tenant may select — see Plan::check_interval_min_seconds.
    */
    'intervals' => [30, 60, 180, 300, 600, 900],

    'default_timeout_seconds' => (int) env('MONITOR_DEFAULT_TIMEOUT_SECONDS', 5),

    /*
    |--------------------------------------------------------------------------
    | Failure / recovery confirmation thresholds
    |--------------------------------------------------------------------------
    | A monitor doesn't flip to DOWN on the first failed check (avoids noisy
    | false positives from transient blips) — it must fail this many times in
    | a row. Same logic in reverse for auto-resolving back to UP.
    */
    'failures_before_incident' => (int) env('MONITOR_FAILURES_BEFORE_INCIDENT', 3),
    'successes_before_resolve' => (int) env('MONITOR_CONFIRMATIONS_BEFORE_RESOLVE', 2),

    /*
    |--------------------------------------------------------------------------
    | Queues
    |--------------------------------------------------------------------------
    | Two queues: the fast lane (30s/1m interval monitors — latency sensitive)
    | and the standard lane (everything else). Horizon workers are configured
    | per-queue in config/horizon.php so a backlog on standard checks never
    | delays fast-interval monitors.
    */
    'queue' => env('MONITOR_QUEUE', 'monitor-checks'),
    'queue_fast' => env('MONITOR_QUEUE_HIGH_PRIORITY', 'monitor-checks-fast'),
    'fast_lane_max_interval_seconds' => 60,

    /*
    |--------------------------------------------------------------------------
    | Monitoring nodes
    |--------------------------------------------------------------------------
    */
    'default_node' => env('MONITOR_DEFAULT_NODE', 'mumbai-1'),
    'nodes' => array_filter(explode(',', env('MONITOR_NODES', 'mumbai-1'))),

    /*
    |--------------------------------------------------------------------------
    | SSL / domain expiry alert thresholds (days remaining)
    |--------------------------------------------------------------------------
    */
    'ssl_alert_days' => [60, 30, 15, 7, 3, 1],
    'domain_alert_days' => [60, 30, 15, 7, 3, 1],
    'ssl_check_hour' => (int) env('SSL_CHECK_HOUR', 2),

    /*
    |--------------------------------------------------------------------------
    | TCP port service presets
    |--------------------------------------------------------------------------
    | Maps a friendly service name to its default port, used when the user
    | picks a service preset instead of typing a raw port number.
    */
    'tcp_services' => [
        'ssh' => 22,
        'ftp' => 21,
        'smtp' => 25,
        'pop3' => 110,
        'imap' => 143,
        'http' => 80,
        'https' => 443,
        'rdp' => 3389,
        'mysql' => 3306,
        'postgresql' => 5432,
        'mongodb' => 27017,
        'mikrotik_api' => 8728,
        'winbox' => 8291,
        'radius' => 1812,
        'dns' => 53,
    ],

    /*
    |--------------------------------------------------------------------------
    | Heartbeat
    |--------------------------------------------------------------------------
    | Grace period multiplier: if a heartbeat monitor's interval is 5 min,
    | it's considered missed after (interval * grace_multiplier) of silence.
    */
    'heartbeat_grace_multiplier' => 1.5,

    /*
    |--------------------------------------------------------------------------
    | Rollup retention
    |--------------------------------------------------------------------------
    | Raw `checks` rows older than this are safe to prune by a scheduled job
    | once rolled up into check_rollups_hourly / check_rollups_daily.
    */
    'raw_checks_retention_days' => 14,
];
