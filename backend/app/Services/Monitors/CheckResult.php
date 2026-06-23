<?php

namespace App\Services\Monitors;

class CheckResult
{
    public function __construct(
        public readonly string $result, // 'up' | 'down' | 'degraded'
        public readonly ?int $responseTimeMs = null,
        public readonly ?int $statusCode = null,
        public readonly ?string $errorMessage = null,
        public readonly array $details = [],
    ) {}

    public static function up(?int $responseTimeMs = null, ?int $statusCode = null, array $details = []): self
    {
        return new self('up', $responseTimeMs, $statusCode, null, $details);
    }

    public static function down(?string $errorMessage = null, ?int $statusCode = null, ?int $responseTimeMs = null, array $details = []): self
    {
        return new self('down', $responseTimeMs, $statusCode, $errorMessage, $details);
    }

    public static function degraded(?int $responseTimeMs = null, ?string $reason = null, array $details = []): self
    {
        return new self('degraded', $responseTimeMs, null, $reason, $details);
    }
}
