<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalSetting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    private static array $testingOverrides = [];

    public static function setTestingOverrides(array $overrides): void
    {
        self::$testingOverrides = $overrides;
    }

    public static function clearTestingOverrides(): void
    {
        self::$testingOverrides = [];
    }

    public static function getValue(string $key, $default = null)
    {
        if (array_key_exists($key, self::$testingOverrides)) {
            return self::$testingOverrides[$key];
        }

        return self::where('key', $key)->value('value') ?? $default;
    }
}
