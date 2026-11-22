# AetherTrade AI — API Specification

Base path: `/api/v1`. Live OpenAPI: `/api/v1/openapi.json`, Swagger UI at `/api/docs`, ReDoc at
`/api/redoc` (disabled in production unless `AETHER_EXPOSE_API_DOCS=true`).

Status legend: **✅ implemented and tested** · 🟡 partially implemented · ⬜ planned (phase noted).

## 1. Conventions

| Topic | Rule |
| --- | --- |
| Versioning | URL prefix `/api/v1`. Breaking changes → `/api/v2`; additive changes stay in v1. |
| Media type | `application/json`; errors are `application/problem+json` (RFC 9457). |
| Authentication | Browser: `aether_access` HttpOnly cookie. API clients: `Authorization: Bearer <jwt>`. |
| CSRF | Cookie-authenticated `POST/PUT/PATCH/DELETE` must send `X-Requested-With: aethertrade`. Bearer-authenticated requests are exempt. |
| Identifiers | UUID strings. |
| Timestamps | ISO 8601 with offset, always UTC (`2026-11-22T09:15:00Z`). Naive timestamps are rejected (422). |
| Decimals | Money, prices and quantities are **JSON strings** (`"100000.00"`) to avoid binary floating-point loss. Analytics values (indicators, ratios, statistics) are JSON numbers. |
| Pagination | Cursor based: `?limit=50&cursor=<opaque>` → `{ "items": [...], "next_cursor": "…" \| null }`. Max `limit` 200. |
| Idempotency | Endpoints that create orders or start long jobs accept `Idempotency-Key` (Phase 5). |
| Request IDs | Every response has `X-Request-ID` (echoed if supplied, else generated). Included in error bodies and logs. |
| Rate limits | Exceeding a limit → `429` with `Retry-After` (seconds). |
| Data provenance | Every market-data payload includes `provider`, `data_mode`, `quality`, `event_ts`, `ingested_at`. |

### 1.1 Error format

```json
{
  "type": "https://aethertrade.local/problems/invalid-credentials",
  "title": "Invalid credentials",
  "status": 401,
  "detail": "Email or password is incorrect.",
  "instance": "/api/v1/auth/login",
  "request_id": "0193b1c4-…",
  "errors": null
}
```

Validation errors (`422`) put field errors in `errors: [{ "loc": [...], "msg": "...", "type": "..." }]`.

### 1.2 Roles and permissions

| Permission | owner | analyst | viewer |
| --- | :-: | :-: | :-: |
| `read` (markets, research, portfolios, reports) | ✓ | ✓ | ✓ |
| `preferences:write` (own preferences, own password) | ✓ | ✓ | ✓ |
| `research:run` (trigger scans, backtests) | ✓ | ✓ | |
| `strategies:write` | ✓ | ✓ | |
| `paper:trade` | ✓ | ✓ | |
| `credentials:manage` | ✓ | | |
| `audit:read` | ✓ | | |
| `users:manage` | ✓ | | |

## 2. Implemented endpoints (Phase 1)

### 2.1 System — ✅

| Method & path | Auth | Description |
| --- | --- | --- |
| `GET /system/health/live` | none | `{"status":"ok"}` when the process is serving. |
| `GET /system/health/ready` | none | Checks database and Redis. `200` with per-dependency status, or `503` when any is down. Never includes connection strings. |
| `GET /system/info` | `read` | `{ "name", "version", "environment", "execution_mode": "research_and_paper_only", "live_trading_available": false, "fixture_data_allowed": bool }` |

### 2.2 Authentication — ✅

| Method & path | Auth | Description |
| --- | --- | --- |
| `POST /auth/login` | none (rate limited) | Body `{ "email", "password" }`. Sets `aether_access` (path `/`), `aether_refresh` (path `/api/v1/auth`) and `aether_session` (routing hint) cookies. Returns `{ "user": User, "access_expires_at" }`. `401` invalid credentials (same response whether the email exists or not); `403` inactive account or missing `X-Requested-With`; `429` rate limited (defaults: 20 attempts/min per IP; 5 failures per 15 min per account and IP; 20 failures per 15 min per account across all IPs). |
| `POST /auth/token` | none (rate limited) | OAuth2 password form (`username`, `password`) for API clients and Swagger. Returns `{ "access_token", "token_type": "bearer", "expires_in" }`. No cookies. |
| `POST /auth/refresh` | refresh cookie (rate limited) | Rotates the refresh token and re-issues cookies. A token rotated less than 10 s ago (two tabs refreshing at once) returns `401` with type `…/session-rotated` and **does not clear cookies**, so the browser keeps the fresh session the other request obtained; clients should retry their original request once. A rotated token presented later revokes the whole token family (`401`, `auth.refresh.reuse_detected` in the audit log). Any other failure clears all session cookies. |
| `POST /auth/logout` | cookie or none | Revokes the current refresh-token family if present and clears cookies. Always `204`. |

### 2.3 Current user — ✅

| Method & path | Permission | Description |
| --- | --- | --- |
| `GET /users/me` | `read` | `User`: `{ id, email, display_name, role, is_active, last_login_at, created_at, permissions[] }` |
| `GET /users/me/preferences` | `read` | `{ base_currency, timezone, number_locale, theme, default_paper_capital, paper_capital_bounds: {min, max}, updated_at }` |
| `PATCH /users/me/preferences` | `preferences:write` | Partial update. `default_paper_capital` must be within the configured bounds (default ₹50,000–₹1,00,000); `timezone` must be a valid IANA zone; `base_currency ∈ {INR, USD}` initially. Audited. |
| `POST /users/me/password` | `preferences:write` | `{ current_password, new_password }`. Minimum 12 characters. Increments `token_version`, revokes all refresh tokens, re-issues cookies for the current client. Audited. |

### 2.4 Integrations (API key management) — ✅

| Method & path | Permission | Description |
| --- | --- | --- |
| `GET /integrations/providers` | `read` | Provider catalog: `{ id, name, category, markets[], secret_fields[], config_fields[], docs_url, adapter_status }`. `adapter_status` is `not_implemented` until that adapter ships (Phase 2) — the API does not claim a live integration exists. |
| `GET /integrations/credentials` | `credentials:manage` | Active credentials: `{ id, provider, label, secret_fields[], secret_hint, config, created_at, updated_at }`. Secrets are never returned. |
| `POST /integrations/credentials` | `credentials:manage` | `{ provider, label, secrets: {field: value}, config: {} }`. Secret fields must match the catalog exactly. Encrypted before storage. `409` if an active credential with the same provider/label exists. Audited (without secret values). |
| `DELETE /integrations/credentials/{id}` | `credentials:manage` | Revokes (keeps the row, destroys the payload). `204`. Audited. |

### 2.5 Audit log — ✅

| Method & path | Permission | Description |
| --- | --- | --- |
| `GET /audit-logs?limit&cursor&action_prefix` | `audit:read` | Newest first. |

## 3. Planned endpoint groups

| Group | Key endpoints | Phase |
| --- | --- | --- |
| `/markets` | `GET /markets` (asset classes, exchanges, session status from calendars), `GET /markets/{exchange}/movers` | ⬜ 2 |
| `/instruments` | `GET /instruments?q&asset_class&exchange`, `GET /instruments/{id}`, `GET /instruments/{id}/contract-specs`, `GET /instruments/{id}/corporate-actions` | ⬜ 2 |
| `/quotes` | `GET /quotes?instrument_ids=` (latest with provenance and staleness) | ⬜ 2 |
| `/candles` | `GET /candles?instrument_id&timeframe&start&end&provider&adjusted` — `provider` required when more than one exists | ⬜ 2 |
| `/watchlists` | CRUD for watchlists and items | ⬜ 2 |
| `/news` | `GET /news?instrument_id&since&event_type`, `GET /news/{id}` (with source link) | ⬜ 4 |
| `/signals` | `GET /signals?status`, `GET /signals/{id}` (with evidence and rejection reasons) | ⬜ 4 |
| `/research` | `POST /research/runs` (trigger), `GET /research/runs`, `GET /research/runs/{id}` (graph state, agent runs), `GET /research/evidence/{id}` | ⬜ 4 |
| `/agents` | `GET /agents` (registry, versions, status), `GET /agents/{name}/runs`, `GET /agents/runs/{id}/events` | ⬜ 4 |
| `/strategies` | `GET/POST /strategies`, `GET /strategies/{id}/versions`, `POST /strategies/{id}/versions` (new immutable version), `POST /strategies/versions/{id}/validate`, `POST /strategies/versions/{id}/retire` | ⬜ 3 |
| `/backtests` | `POST /backtests` (job), `GET /backtests/{id}` (status, metrics), `GET /backtests/{id}/trades`, `GET /backtests/{id}/equity`, `POST /backtests/walk-forward` | ⬜ 3 |
| `/optimization` | `POST /optimization/runs`, `GET /optimization/runs/{id}` (trials, deflated Sharpe, PBO) | ⬜ 6 |
| `/portfolios` | `GET/POST /portfolios`, `GET /portfolios/{id}` (balances, exposure), `GET /portfolios/{id}/equity`, `GET /portfolios/{id}/positions`, `GET /portfolios/{id}/ledger` | ⬜ 5 |
| `/paper` | `POST /paper/orders` (`Idempotency-Key`; runs risk check first), `GET /paper/orders`, `POST /paper/orders/{id}/cancel`, `GET /paper/fills`, `GET /paper/tournaments`, `POST /paper/tournaments` | ⬜ 5 |
| `/analytics` | `GET /analytics/performance?subject`, `POST /analytics/monte-carlo`, `POST /analytics/projections`, `GET /analytics/risk?portfolio_id` | ⬜ 6 |
| `/reports` | `GET /reports?type`, `GET /reports/{id}`, `GET /reports/daily/latest` | ⬜ 4 / 6 |

## 4. WebSocket protocol — ⬜ Phase 2

Endpoint: `GET /api/v1/ws` (upgrade). Authenticated by the access cookie or a `token` sent in the first
message within 5 s; otherwise closed with code `4401`.

Client → server:

```json
{ "op": "subscribe", "channel": "quotes", "keys": ["<instrument_id>"] }
{ "op": "unsubscribe", "channel": "quotes", "keys": ["<instrument_id>"] }
{ "op": "ping" }
```

Server → client:

```json
{ "channel": "quotes", "key": "<instrument_id>", "seq": 1042, "data": { "...": "...", "provider": "upstox", "data_mode": "live", "event_ts": "…" } }
{ "channel": "system", "event": "resync_required" }
```

Channels: `quotes`, `candles`, `signals`, `portfolio` (paper portfolio changes), `agents` (agent
status), `notifications`. Messages carry a per-channel `seq`; on a gap the client refetches via REST.
Backed by Redis Streams consumer groups so multiple API processes fan out consistently.
