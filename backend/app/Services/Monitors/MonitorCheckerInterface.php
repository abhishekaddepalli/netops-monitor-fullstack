<?php

namespace App\Services\Monitors;

use App\Models\Monitor;

interface MonitorCheckerInterface
{
    /**
     * Execute the check and return a normalized result.
     * Never throws on expected failure conditions (timeout, refused connection,
     * bad status code) — those are valid "down" results, not exceptions.
     * Only throws on genuine misconfiguration (e.g. malformed target).
     */
    public function check(Monitor $monitor): CheckResult;
}
