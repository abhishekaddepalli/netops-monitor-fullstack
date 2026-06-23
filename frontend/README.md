# NetOps Monitor — Frontend

A React + Vite single-page app for the NetOps Monitor platform, wired to the
Laravel backend built earlier in this conversation. Same Indian-flag-accented
design system as the original dashboard mockup (saffron/green status colors,
navy "chakra blue" primary actions, the tri-color live health strip), now as
real, working components calling a real API.

This was written without a Node/npm environment with internet access to
actually run `npm install` and `npm run dev` against, so **please run it
yourself and watch the dev console before deploying** — see the caveat at
the bottom.

---

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Opens on `http://localhost:5173`. The Vite dev server proxies `/api/*` and
`/hb/*` requests to `http://localhost:8000` (see `vite.config.js`) — so run
the Laravel backend (`php artisan serve`) alongside this for everything to
actually load data.

Log in with the backend's seeded demo account: `ravi@bharatpay.in` /
`Demo@2026`, or register a new organization from `/register`.

### Production build
```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally to sanity-check it
```
For production, set `VITE_API_BASE_URL` in `.env` to your deployed API's
full URL (e.g. `https://api.netopsmonitor.in`) since there's no dev proxy
once built.

---

## What's here

- **Auth**: Login, Register (creates org + first org_admin), token stored in
  localStorage, auto-redirect to `/login` on 401.
- **Dashboard**: live KPI cards (uptime %, active incidents, avg response
  time, SSL expiring soon), ApexCharts response-time graph with 24h/7d/30d
  ranges, recent incidents, monitors snapshot — all from `/v1/dashboard/*`.
- **Monitors**: list with type/search filters, create modal covering all 7
  monitor types (HTTP, Ping, TCP Port, SSL, DNS, Heartbeat, API) with
  type-aware fields, pause/resume/delete, detail page with response-time
  chart, SSL panel, incident timeline, "Test now" button.
- **Incidents**: active/resolved/all filters, acknowledge/resolve actions.
- **Status Pages**: management list + create modal (pick which monitors
  become public components), plus a fully standalone public route at
  `/status/:slug` (no auth, no app chrome) matching what `status.company.com`
  would actually show, including password-protection handling.
- **Team**: member list, role changes (Org Admin/Operator/Read-only),
  invite modal.
- **Alert Channels**: create/test/delete for all 8 channel types the
  backend supports.
- **Settings**: org info, account info, API key generation (shows the
  plaintext key exactly once, matching the backend's one-time-reveal design).
- **Super Admin**: a cross-tenant organizations page at `/admin`, gated by
  role, for suspending/unsuspending tenants.
- **RBAC in the UI**: `useAuth()` exposes `isOrgAdmin` / `isOperatorOrAbove`
  / `isSuperAdmin` — action buttons (create, delete, pause, invite, etc.)
  are hidden for Read-only users exactly matching what the backend's
  middleware would reject anyway, so the UI doesn't dangle controls that
  would just 403.

## What's NOT here (intentionally, to stay honest about scope)

- **WebSocket live updates**: the health strip and incident badge poll the
  `/v1/dashboard/summary` endpoint every 30s instead of subscribing to the
  backend's `MonitorStatusChanged`/`IncidentCreated` broadcasts. Wiring
  Laravel Echo + Pusher client libraries in is the natural next step — the
  backend already broadcasts on private channels named `org.{id}.monitors`
  and `org.{id}.incidents`.
- **Monitor editing**: the Detail page's "Edit" button is present but not
  wired to a form yet — only create, not update, has a UI. The API call
  (`monitorsApi.update`) already exists in `src/api/monitors.js`.
- **2FA setup UI, IP restrictions UI, audit log viewer**: backend fields/
  endpoints exist for some of these; no frontend screens were built for them.
- **SNMP/ISP module, billing/checkout UI**: matches the backend, which also
  doesn't implement these yet.

## Known limitation in this build process

Like the backend, this was written without an executable Node environment
to actually run `npm install`, start the dev server, and click through it —
there was no way to catch a typo'd import path or a JSX syntax slip by
actually rendering the app before handing it to you. Every file follows
correct React 18 / Vite / React Router v6 conventions and was traced by
hand for consistency (prop names, API response shapes matching the backend
controllers exactly), but **please run `npm install && npm run dev` and
click through the main flows yourself** before trusting this in front of
real users.
