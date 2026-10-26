<?php

namespace App\Services\Auth;

class TotpService
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a cryptographically secure Base32 secret key (16 or 32 chars).
     */
    public static function generateSecret(int $length = 16): string
    {
        $secret = '';
        $bytes = random_bytes($length);
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_CHARS[ord($bytes[$i]) % 32];
        }
        return $secret;
    }

    /**
     * Decode a Base32 string to binary bytes.
     */
    public static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
        $buffer = 0;
        $bufferSize = 0;
        $binary = '';

        for ($i = 0; $i < strlen($b32); $i++) {
            $val = strpos(self::BASE32_CHARS, $b32[$i]);
            if ($val === false) continue;
            $buffer = ($buffer << 5) | $val;
            $bufferSize += 5;

            if ($bufferSize >= 8) {
                $bufferSize -= 8;
                $binary .= chr(($buffer >> $bufferSize) & 0xFF);
            }
        }

        return $binary;
    }

    /**
     * Calculate 6-digit TOTP code for a secret and timestamp.
     */
    public static function getCode(string $secret, ?int $timestamp = null, int $timeStep = 30): string
    {
        $timestamp = $timestamp ?? time();
        $counter = (int) floor($timestamp / $timeStep);

        $secretBytes = self::base32Decode($secret);
        // 64-bit big-endian binary representation of counter
        $timeBytes = pack('N*', 0) . pack('N*', $counter);

        $hash = hash_hmac('sha1', $timeBytes, $secretBytes, true);
        $offset = ord($hash[19]) & 0x0F;

        $binary = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        );

        $otp = $binary % 1000000;
        return str_pad((string) $otp, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Verify code with window of +/- 1 time step (tolerance for clock drift = +/- 30s).
     */
    public static function verifyCode(string $secret, string $code, int $discrepancy = 1): bool
    {
        $code = trim($code);
        if (strlen($code) !== 6 || !ctype_digit($code)) {
            return false;
        }

        $currentTime = time();
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $time = $currentTime + ($i * 30);
            if (hash_equals(self::getCode($secret, $time), $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate an otpauth URL for QR codes.
     */
    public static function getOtpAuthUrl(string $company, string $account, string $secret): string
    {
        $encodedCompany = rawurlencode($company);
        $encodedAccount = rawurlencode($account);
        return "otpauth://totp/{$encodedCompany}:{$encodedAccount}?secret={$secret}&issuer={$encodedCompany}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Generate a set of random recovery codes.
     */
    public static function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $part1 = bin2hex(random_bytes(2));
            $part2 = bin2hex(random_bytes(2));
            $codes[] = "{$part1}-{$part2}";
        }
        return $codes;
    }
}
