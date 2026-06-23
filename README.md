# NetOps Monitor — Full Stack

This archive contains both halves of the platform built in this conversation:

- **`backend/`** — Laravel 12 API: multi-tenant schema, monitoring engine
  (HTTP/Ping/TCP/SSL/DNS/API/Heartbeat checkers), queue-based scheduler,
  incident management, 8-channel alerting, REST API, RBAC. See
  `backend/README.md` for full setup.

- **`frontend/`** — React + Vite SPA: dashboard, monitors, incidents, status
  pages (management + public), team, alert channels, settings — wired to
  the backend's REST API. See `frontend/README.md` for full setup.

## Running both together

```bash
# Terminal 1 — backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
# configure .env: DB_*, REDIS_*
php artisan migrate --seed
php artisan serve              # http://localhost:8000

# Terminal 2 — queue worker (required for monitors to actually get checked)
cd backend
php artisan horizon            # or: php artisan queue:work

# Terminal 3 — scheduler (required for the check dispatcher to run every minute)
cd backend
php artisan schedule:work

# Terminal 4 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev                    # http://localhost:5173, proxies /api to :8000
```

Then open `http://localhost:5173` and log in with the seeded demo account:
**demo.infiniforge.cloud / Demo@2026**

## Important: neither half has been executed end-to-end

Both `backend/` and `frontend/` were written in a sandboxed environment
without network access or a working PHP/Node runtime to install
dependencies and actually run the code against each other. Every file
follows correct framework conventions and the API contracts between the
two (route paths, request/response shapes) were cross-checked by hand, but
this has **not been verified by actually running it**. Treat first boot as
a real test, not a formality — run `composer install` + `php artisan test`
on the backend and `npm install` + click through the main flows on the
frontend before relying on this anywhere real.

See each subfolder's own README for what's fully implemented vs. what's
intentionally stubbed (ISP/SNMP module, billing checkout, push
notifications, WebSocket live updates, etc).
