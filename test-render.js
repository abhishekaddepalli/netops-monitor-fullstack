const fs = require('fs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Mock data
const monitor = {"id":21,"uuid":"220a8b8e-6b7e-4f38-be24-589e850628ed","organization_id":2,"team_id":null,"created_by":1,"name":"KitsSNMP","type":"snmp","target":"117.240.120.220","port":161,"config":{"community":"kits","version":"2c","user":null,"auth_pass":null,"priv_pass":null},"check_interval_seconds":30,"timeout_seconds":5,"confirmation_failures":3,"confirmation_successes":2,"status":"up","status_since":"2026-06-26T06:55:30.000000Z","consecutive_failures":0,"consecutive_successes":383,"last_checked_at":"2026-06-27T02:59:07.000000Z","next_check_at":"2026-06-27T02:59:37.000000Z","last_response_time_ms":107,"heartbeat_token":null,"heartbeat_last_ping_at":null,"is_paused":false,"maintenance_mode":false,"maintenance_until":null,"tags":null,"sort_order":0,"created_at":"2026-06-26T06:54:50.000000Z","updated_at":"2026-06-27T02:59:07.000000Z","deleted_at":null,"escalation_policy_id":null};

const checks = [
    {
        "id": 43103,
        "monitor_id": 21,
        "monitoring_node_id": null,
        "result": "up",
        "response_time_ms": 103,
        "status_code": 200,
        "error_message": null,
        "details": {
            "uptime": "16d 22h 58m 00\ns",
            "sysName": "KI_DVL",
            "sysDescr": "RouterOS x86"
        },
        "checked_at": "2026-06-27T03:00:41.000000Z",
        "created_at": "2026-06-27 08:30:41",
        "updated_at": "2026-06-27 08:30:41"
    }
];

const serverMetrics = [
    {
        "id": 776,
        "monitor_id": 21,
        "cpu_usage_pct": 0,
        "ram_usage_pct": 10.66642640129,
        "disk_usage_pct": 0.017507144044263,
        "interfaces": [
            {
                "name": "MGMT-V10",
                "status": "UP",
                "in_octets": "276",
                "out_octets": "34503541",
                "ips": [
                    "10.20.1.1"
                ]
            }
        ],
        "created_at": "2026-06-27T03:00:41.000000Z"
    }
];

const incidents = [];

// Load component (compiled by Babel/Vite in dist, but we can't easily require Vite modules without a bundler)
// We need to parse the actual component source using babel
