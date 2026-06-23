<?php

return [
    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
    ],
    'slack' => [
        'default_webhook' => env('SLACK_WEBHOOK_DEFAULT'),
    ],
    'discord' => [
        'default_webhook' => env('DISCORD_WEBHOOK_DEFAULT'),
    ],
    'twilio' => [
        'sid' => env('TWILIO_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'whatsapp_from' => env('TWILIO_WHATSAPP_FROM'),
    ],
    'msg91' => [
        'auth_key' => env('MSG91_AUTH_KEY'),
    ],
    'gupshup' => [
        'api_key' => env('GUPSHUP_API_KEY'),
    ],
    'razorpay' => [
        'key' => env('RAZORPAY_KEY'),
        'secret' => env('RAZORPAY_SECRET'),
    ],
    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],
];
