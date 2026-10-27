<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsPage extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'meta_title',
        'meta_description',
        'is_published',
        'blocks',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'blocks' => 'array',
    ];

    /**
     * Rich default blocks for fresh pages or when resetting defaults.
     */
    public static function getDefaultBlocks(string $slug = 'home'): array
    {
        if ($slug === 'home') {
            return [
                [
                    'id' => 'hero-1',
                    'type' => 'heading',
                    'data' => [
                        'badge' => '⚡ Trusted by 100,000+ DevOps Engineers Worldwide',
                        'title' => 'Downtime Happens.',
                        'highlight' => 'Get Alerted Instantly.',
                        'subtitle' => 'Monitor Websites, APIs, Servers, and Network Devices from 150+ global checkpoints with sub-minute accuracy and multi-channel instant notifications.',
                        'primary_button_text' => 'Start Monitoring Free',
                        'primary_button_link' => '/register',
                        'secondary_button_text' => 'Explore Live Demo',
                        'secondary_button_link' => '/login',
                        'align' => 'center',
                    ],
                ],
                [
                    'id' => 'stats-1',
                    'type' => 'stats',
                    'data' => [
                        'items' => [
                            ['label' => 'Uptime Monitored', 'value' => '99.99%'],
                            ['label' => 'Global Checkpoints', 'value' => '150+'],
                            ['label' => 'Daily Probes', 'value' => '10M+'],
                            ['label' => 'Alert Speed', 'value' => '< 500ms'],
                        ]
                    ]
                ],
                [
                    'id' => 'slider-1',
                    'type' => 'sliders',
                    'data' => [
                        'title' => 'Complete Infrastructure Observability',
                        'subtitle' => 'Explore the comprehensive toolkit engineered for reliability and high availability.',
                        'slides' => [
                            [
                                'id' => 'slide-1',
                                'badge' => 'Multi-Region Probes',
                                'title' => 'HTTP & API Deep Health Checks',
                                'description' => 'Continuously validate response codes, latency headers, TLS certificates, and payload keywords from distributed edge nodes worldwide.',
                                'button_text' => 'Learn More',
                                'button_link' => '/register',
                                'bg_color' => 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%)',
                            ],
                            [
                                'id' => 'slide-2',
                                'badge' => 'Network Maps',
                                'title' => 'Interactive Network Topology & Maps',
                                'description' => 'Visualize real-time interconnects, switch links, routers, and edge nodes with automated Dude-compatible link traffic meters and live latency sparklines.',
                                'button_text' => 'Explore Maps',
                                'button_link' => '/register',
                                'bg_color' => 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%)',
                            ],
                            [
                                'id' => 'slide-3',
                                'badge' => 'Instant Incident Dispatch',
                                'title' => 'Multi-Channel Alert Orchestration',
                                'description' => 'Zero-lag escalations across WhatsApp, Telegram, WirePusher, Email, Slack, Discord, MS Teams, and customizable Webhooks.',
                                'button_text' => 'View Integrations',
                                'button_link' => '/register',
                                'bg_color' => 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%)',
                            ],
                        ]
                    ]
                ],
                [
                    'id' => 'features-1',
                    'type' => 'features',
                    'data' => [
                        'title' => 'Enterprise Features Built For Scale',
                        'subtitle' => 'Everything your team needs to prevent outages and respond before customers notice.',
                        'items' => [
                            [
                                'icon' => 'Activity',
                                'title' => 'Ping & ICMP Probes',
                                'description' => 'Sub-second packet loss and round-trip time measurements with confirmation thresholds.',
                            ],
                            [
                                'icon' => 'ShieldCheck',
                                'title' => 'SSL Expiry Guard',
                                'description' => 'Proactive warnings 30, 14, and 7 days prior to SSL/TLS certificate expirations.',
                            ],
                            [
                                'icon' => 'Network',
                                'title' => 'SNMP & Network Discovery',
                                'description' => 'Automated subnet sweeping and SNMP walk metrics for routers, switches, and APs.',
                            ],
                            [
                                'icon' => 'Radio',
                                'title' => 'Audio Alarms & Sound Radar',
                                'description' => 'Selectable siren presets with manual one-click silence buttons and group mutes.',
                            ],
                            [
                                'icon' => 'Globe',
                                'title' => 'Public Status Pages',
                                'description' => 'Custom branded status pages with component uptime bars, incident timelines, and domain mapping.',
                            ],
                            [
                                'icon' => 'Bell',
                                'title' => 'Escalation Policies',
                                'description' => 'Multi-tiered delayed escalation levels that automatically cancel when acknowledged.',
                            ],
                        ]
                    ]
                ],
                [
                    'id' => 'pricing-1',
                    'type' => 'pricing',
                    'data' => [
                        'title' => 'Simple, Transparent Pricing',
                        'subtitle' => 'Start for free, upgrade when you need faster check intervals, more monitors, or white-labeling.',
                        'show_cycle_toggle' => true,
                    ]
                ],
                [
                    'id' => 'faq-1',
                    'type' => 'faq',
                    'data' => [
                        'title' => 'Frequently Asked Questions',
                        'subtitle' => 'Got questions about NetOps Monitor? Find answers below.',
                        'items' => [
                            [
                                'q' => 'How fast are downtime alerts dispatched?',
                                'a' => 'Alerts trigger immediately upon consecutive confirmed failures. Multi-channel notifications to WhatsApp, Telegram, WirePusher, Email, and Slack dispatch synchronously without waiting for background queues.',
                            ],
                            [
                                'q' => 'Can I install NetOps Monitor on mobile as a PWA?',
                                'a' => 'Yes! NetOps Monitor is a progressive web app (PWA). You can install it on your Android or iOS phone, iPad, or desktop browser for a full native app experience with offline caching.',
                            ],
                            [
                                'q' => 'Can I use custom domain status pages?',
                                'a' => 'Yes, our platform supports white-labeled status pages with custom domains, custom colors, logos, and subscriber email notifications.',
                            ],
                            [
                                'q' => 'What payment methods are supported for subscriptions?',
                                'a' => 'We accept credit/debit cards, UPI, and NetBanking via Razorpay, as well as manual UPI transfer with instant screenshot upload and admin verification.',
                            ],
                        ]
                    ]
                ],
                [
                    'id' => 'cta-1',
                    'type' => 'cta',
                    'data' => [
                        'title' => 'Ready to Eliminate Downtime Surprises?',
                        'subtitle' => 'Join thousands of companies who trust NetOps Monitor for their mission-critical infrastructure.',
                        'button_text' => 'Get Started for Free',
                        'button_link' => '/register',
                    ]
                ]
            ];
        }

        return [
            [
                'id' => 'heading-1',
                'type' => 'heading',
                'data' => [
                    'title' => ucwords(str_replace('-', ' ', $slug)),
                    'subtitle' => 'Learn more about NetOps Monitor.',
                    'align' => 'center',
                ]
            ],
            [
                'id' => 'text-1',
                'type' => 'text',
                'data' => [
                    'title' => 'Overview',
                    'content' => 'Welcome to ' . ucwords(str_replace('-', ' ', $slug)) . '. NetOps Monitor provides comprehensive observability for networks, servers, and cloud applications.',
                ]
            ]
        ];
    }
}
