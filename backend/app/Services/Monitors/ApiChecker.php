<?php

namespace App\Services\Monitors;

use App\Models\Monitor;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;

class ApiChecker implements MonitorCheckerInterface
{
    /**
     * Config shape:
     * {
     *   "method": "GET",
     *   "expected_status": [200],
     *   "headers": {"Authorization": "Bearer ..."},
     *   "body": "{...}",                  // request payload for POST/PUT
     *   "json_path": "status",            // dot-notation, e.g. "data.user.active"
     *   "expected_value": "success"
     * }
     * Validates: status code -> JSON parses -> value at json_path matches.
     */
    public function check(Monitor $monitor): CheckResult
    {
        $config = $monitor->config ?? [];
        $client = new Client([
            'timeout' => $monitor->timeout_seconds,
            'http_errors' => false,
            'headers' => array_merge(['Accept' => 'application/json'], $config['headers'] ?? []),
        ]);

        $options = [];
        if (! empty($config['body'])) {
            $options['body'] = $config['body'];
            $options['headers']['Content-Type'] ??= 'application/json';
        }

        $start = microtime(true);

        try {
            $response = $client->request($config['method'] ?? 'GET', $monitor->target, $options);
        } catch (ConnectException $e) {
            return CheckResult::down('Connection failed: '.mb_substr($e->getMessage(), 0, 300));
        } catch (RequestException $e) {
            return CheckResult::down('Request failed: '.mb_substr($e->getMessage(), 0, 300));
        }

        $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        $statusCode = $response->getStatusCode();
        $expectedStatuses = $config['expected_status'] ?? range(200, 299);

        if (! in_array($statusCode, $expectedStatuses, true)) {
            return CheckResult::down("Unexpected status code: {$statusCode}", $statusCode, $elapsedMs);
        }

        $body = (string) $response->getBody();
        $decoded = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return CheckResult::down('Response is not valid JSON.', $statusCode, $elapsedMs, ['body_snippet' => mb_substr($body, 0, 500)]);
        }

        if (! empty($config['json_path'])) {
            $actual = data_get($decoded, $config['json_path']);
            $expected = $config['expected_value'] ?? null;

            if ((string) $actual !== (string) $expected) {
                return CheckResult::down(
                    "JSON value mismatch at '{$config['json_path']}': expected \"{$expected}\", got \"".json_encode($actual).'"',
                    $statusCode,
                    $elapsedMs,
                    ['response_sample' => array_slice($decoded, 0, 5, true)]
                );
            }
        }

        return CheckResult::up($elapsedMs, $statusCode);
    }
}
