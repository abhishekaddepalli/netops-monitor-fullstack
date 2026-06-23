<?php

namespace App\Services\Monitors;

use App\Models\Monitor;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\TooManyRedirectsException;

class HttpChecker implements MonitorCheckerInterface
{
    /**
     * Config shape (Monitor::config), all keys optional except none —
     * sensible defaults applied below:
     * {
     *   "method": "GET",
     *   "expected_status": [200,201,202,204,301,302],
     *   "keyword": "Welcome",            // body must contain this
     *   "keyword_negative": "Error 500", // body must NOT contain this
     *   "headers": {"X-Custom": "value"},
     *   "auth": {"type":"basic","username":"...","password":"..."},
     *   "follow_redirects": true,
     *   "verify_ssl": true,
     *   "user_agent": "NetOpsMonitor/1.0",
     *   "body": null,                    // request body for POST/PUT
     *   "degraded_threshold_ms": 3000    // response slower than this = degraded, not down
     * }
     */
    public function check(Monitor $monitor): CheckResult
    {
        $config = $monitor->config ?? [];
        $client = new Client([
            'timeout' => $monitor->timeout_seconds,
            'connect_timeout' => min(10, $monitor->timeout_seconds),
            'allow_redirects' => ($config['follow_redirects'] ?? true) ? ['max' => 10] : false,
            'verify' => $config['verify_ssl'] ?? false, // Default false to avoid cURL 60 errors on local/misconfigured servers
            'http_errors' => false, // we inspect status codes ourselves
            'headers' => array_merge([
                'User-Agent' => $config['user_agent'] ?? 'NetOpsMonitor/1.0 (+https://netopsmonitor.in/bot)',
            ], $config['headers'] ?? []),
        ]);

        $options = [];
        if (! empty($config['auth']['type']) && $config['auth']['type'] === 'basic') {
            $options['auth'] = [$config['auth']['username'] ?? '', $config['auth']['password'] ?? ''];
        }
        if (! empty($config['body'])) {
            $options['body'] = $config['body'];
        }

        $start = microtime(true);

        try {
            $response = $client->request($config['method'] ?? 'GET', $monitor->target, $options);
        } catch (ConnectException $e) {
            return CheckResult::down('Connection failed: '.$this->shortenError($e->getMessage()));
        } catch (TooManyRedirectsException $e) {
            return CheckResult::down('Too many redirects.');
        } catch (RequestException $e) {
            return CheckResult::down('Request failed: '.$this->shortenError($e->getMessage()));
        }

        $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        $statusCode = $response->getStatusCode();
        $expectedStatuses = $config['expected_status'] ?? range(200, 299);

        if (! in_array($statusCode, $expectedStatuses, true)) {
            return CheckResult::down(
                "Unexpected status code: {$statusCode}",
                $statusCode,
                $elapsedMs,
                ['headers_sample' => $this->sampleHeaders($response)]
            );
        }

        $body = (string) $response->getBody();
        $bodySnippet = mb_substr($body, 0, 500);

        if (! empty($config['keyword']) && ! str_contains($body, $config['keyword'])) {
            return CheckResult::down(
                "Expected keyword not found: \"{$config['keyword']}\"",
                $statusCode,
                $elapsedMs,
                ['body_snippet' => $bodySnippet]
            );
        }

        if (! empty($config['keyword_negative']) && str_contains($body, $config['keyword_negative'])) {
            return CheckResult::down(
                "Forbidden keyword found: \"{$config['keyword_negative']}\"",
                $statusCode,
                $elapsedMs,
                ['body_snippet' => $bodySnippet]
            );
        }

        $degradedThreshold = $config['degraded_threshold_ms'] ?? 3000;
        if ($elapsedMs > $degradedThreshold) {
            return CheckResult::degraded($elapsedMs, "Response time {$elapsedMs}ms exceeds {$degradedThreshold}ms threshold", [
                'headers_sample' => $this->sampleHeaders($response),
            ]);
        }

        return CheckResult::up($elapsedMs, $statusCode, [
            'headers_sample' => $this->sampleHeaders($response),
        ]);
    }

    private function sampleHeaders($response): array
    {
        $interesting = ['content-type', 'server', 'cache-control', 'x-powered-by'];
        $out = [];
        foreach ($interesting as $h) {
            if ($response->hasHeader($h)) {
                $out[$h] = $response->getHeaderLine($h);
            }
        }

        return $out;
    }

    private function shortenError(string $message): string
    {
        return mb_substr(explode("\n", $message)[0] ?? $message, 0, 300);
    }
}
