# NetOps Monitor — Backend

Laravel 12 multi-tenant monitoring platform backend. Core monitoring engine,
incidents, alerting, REST API, and RBAC are fully implemented and runnable.
ISP/SNMP module, billing payment integration, and a few alert channels are
scaffolded but intentionally left as documented extension points — see
**What's NOT fully wired** below before you assume something works.

This was generated without a live PHP/Composer environment to execute
against, so **run `composer install` and the smoke tests below before your
first real deployment** to catch anything a static read-through could miss.

---

## Quick start

```bash
composer install
cp .env.example .env
php artisan key:generate

# Edit .env: set DB_*, REDIS_*, MAIL_*, MONITOR_NODES, etc.

php artisan migrate
php artisan db:seed
```

This seeds:
- 4 plans (Free/Starter/Professional/Enterprise)
- 6 monitoring nodes (Mumbai, Hyderabad, Singapore, London, Frankfurt, New York)
- A Super Admin: `admin@netopsmonitor.in` / `ChangeMe!2026` — **change this immediately**
- A demo tenant "BharatPay Pvt Ltd" with 11 monitors, an active incident, 7 days
  of rollup history, and a published status page — login as
  `ravi@bharatpay.in` / `Demo@2026` (org_admin) or `priya@bharatpay.in` / `Demo@2026` (operator)

### Run it

```bash
php artisan serve              # API on http://localhost:8000

# In separate terminals:
php artisan horizon            # queue workers (or `php artisan queue:work` if you don't want the Horizon dashboard)
php artisan schedule:work      # local dev equivalent of the cron entry below
```

On a real server, replace `schedule:work` with a single cron entry:
```
* * * * * cd /path-to-app && php artisan schedule:run >> /dev/null 2>&1
```

### Run tests
```bash
php artisan test
```

---

## Architecture in one paragraph

`DispatchDueMonitorChecksJob` runs every minute, finds every monitor whose
`next_check_at` has passed, and queues one `RunMonitorCheckJob` per monitor
onto either the `monitor-checks-fast` queue (≤60s intervals) or
`monitor-checks` queue (everything else). Each `RunMonitorCheckJob` resolves
the right checker class via `MonitorCheckerFactory` (HTTP/Ping/TCP/SSL/DNS/
API/Heartbeat), writes a `checks` row, then calls `ProcessCheckResultJob`,
which applies the result to the monitor's status state machine (confirming
N failures before DOWN, M successes before UP again), fires
`MonitorStatusChanged` for the live dashboard WebSocket feed, and hands off
to `IncidentManager` to open/resolve incidents. Incident open/resolve events
trigger `AlertDispatcher`, which walks the monitor's `EscalationPolicy` and
queues `SendAlertJob` per step (delayed by `delay_minutes`, auto-skipped if
the incident gets acknowledged first). Every hour, `RollupCheckStatsJob`
aggregates raw `checks` rows into `check_rollups_hourly`/`daily` so
dashboards and SLA reports never scan raw time-series data — this is the
piece that makes the 100,000+ monitor scale target realistic rather than
aspirational.

---

## What's fully implemented

- **Schema**: 21 migrations — orgs, teams, RBAC, monitors, checks + hourly/daily
  rollups, incidents + timeline, SSL/domain expiry, alert channels +
  escalation policies + alert log, status pages, API keys, audit log,
  billing tables, Spatie permission tables, queue tables.
- **Monitor types**: HTTP/HTTPS (status/keyword/header/auth/redirect/SSL-verify),
  Ping (ICMP via system `ping`), TCP Port (all 15 services from the spec),
  SSL (cert chain + expiry), DNS (A/AAAA/MX/TXT/CNAME/NS + change detection),
  API (JSON path/value validation), Heartbeat (inbound cron pings).
- **Engine**: queue-based dispatcher + scheduler, confirmation-based status
  state machine, auto incident create/resolve, hourly/daily rollups with raw
  check pruning.
- **Alerting**: Email, Webhook (HMAC-signed), Slack, Telegram, Discord, MS
  Teams, SMS (MSG91), WhatsApp (Twilio) — all send real HTTP requests, all
  logged to `alert_logs`. Escalation policies with per-level delay and
  acknowledge-to-skip logic.
- **Auth & RBAC**: Sanctum token auth + org-scoped API keys, 4-tier roles
  (Super Admin / Org Admin / Operator / Read-only) enforced via middleware
  on every route, full multi-tenant isolation.
- **REST API**: Monitors, Incidents, Dashboard, Status Pages (+ public
  endpoint), Alert Channels, Team management, API Keys, Super Admin org
  management — all in `routes/api.php`.
- **Status pages**: public JSON endpoint, password protection, computed
  overall status, incident timeline.

## What's NOT fully wired (and what to do about it)

- **SNMP / MikroTik / Radius / ISP module**: no checker classes. Needs
  `php-snmp` extension + a RouterOS API client; `MonitorCheckerFactory`'s
  docblock shows exactly where to register them once built.
- **Push notifications**: `PushAlertSender` throws on purpose — needs a
  `device_tokens` table and FCM/APNs wiring first.
- **SSL/domain expiry alerts on non-email channels**: `CheckSslExpiryJob`
  only sends via email today; extend `AlertSenderInterface` with a generic
  `sendRaw()` method to cover Slack/Telegram/webhook the same way incident
  alerts do.
- **Billing**: schema + `Plan`/`Subscription`/`Invoice` models exist;
  Razorpay/Stripe checkout flow and webhook handlers are not implemented.
- **White-label**: organization columns exist (`white_label_domain`,
  colors, logos); the middleware that resolves a request's tenant by
  custom domain and serves branded emails/UI is not built.
- **Frontend**: this is backend-only. A separate dashboard UI (matching
  this API) was built earlier in this conversation as a static HTML file —
  wire it up to these endpoints, or use it as a visual reference for a
  proper SPA.
- **Multi-node distributed checks**: schema (`monitoring_nodes`,
  `monitor_node` pivot) supports it; `RunMonitorCheckJob` currently runs
  wherever the queue worker is, not pinned to a specific region. Real
  multi-region checking needs region-tagged queue workers (one Horizon
  deployment per node) consuming only that node's queue.

## Known limitation in this build process

This code was written without an executable PHP environment available to
run `composer install`, `php artisan migrate`, or the test suite against a
real database — there was no way to verify it end-to-end before handing it
to you. Everything follows correct Laravel 12 / Sanctum / Horizon
conventions and the internal logic was traced by hand, but **please run
`composer install` and `php artisan test` yourself before deploying**, and
treat anything subtle (a typo'd config key, an edge case in a job) as
possible until you've seen it boot.
