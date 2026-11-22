---
name: aethertrade-ai
description: Working rules for the AetherTrade AI quantitative research and paper-trading platform in aethertrade-ai/ (FastAPI + TimescaleDB backend, Next.js terminal frontend, LangGraph agents). Use for any change under aethertrade-ai/ — backend, frontend, migrations, strategies, backtests, agents, market data providers, paper trading or docs.
---

# AetherTrade AI — project skill

AetherTrade AI is a single-user **research and paper-trading** platform. It is not an execution system
and not an advice service. Read `docs/ARCHITECTURE.md` before structural changes and
`docs/DEVELOPMENT_ROADMAP.md` to see what phase a feature belongs to.

## Non-negotiable invariants

1. **No live trading.** Never add code that places, modifies or cancels real broker orders. Provider
   adapters are data-only.
2. **Never fabricate data.** No invented prices, metrics, API responses or "demo" numbers in the UI.
   Unimplemented modules show an explicit empty state naming the phase that delivers them.
   Development fixtures are the `fixture` provider, gated by `AETHER_ALLOW_FIXTURE_DATA`, and always
   rendered with a FIXTURE badge.
3. **Provenance on every market record:** provider, `data_mode` (live/delayed/historical/fixture),
   quality, `event_ts`, `ingested_at`, instrument, exchange, asset class, currency, timeframe. Never
   silently mix providers, exchanges, currencies or contract months.
4. **Numbers:** `Decimal` + `NUMERIC` for money, prices, quantities (JSON strings on the wire);
   `float64` only for analytics. Floats never touch the ledger.
5. **Time:** timezone-aware UTC everywhere; naive datetimes are bugs.
6. **No look-ahead:** decisions use only data with `available_at <= decision_time`; fills default to
   the next bar.
7. **LLMs never produce numbers.** Deterministic code computes; agents cite evidence IDs; outputs are
   Pydantic-validated; the supervisor rejects unsupported claims. External text is untrusted input.
8. **Risk veto is mandatory:** no paper order without an approving `risk_decisions` row.
9. **Immutability:** validated strategy versions, audit logs, fills and ledger entries are never
   updated or deleted. Changes create new rows/versions. Migrations are never edited after merge.
10. **Secrets:** never hard-code, log, return from the API, or pass to an LLM. Provider keys live
    encrypted in `provider_credentials`.
11. **Returns language:** always label returns as historical, simulated, projected or realized. Never
    imply a return is expected or guaranteed. `NO_TRADE` is a valid, first-class outcome.

## Layout

```
aethertrade-ai/
├── backend/            FastAPI app (uv project)
│   ├── app/core/       config, logging, security, crypto, errors, middleware, rate_limit, ids, permissions
│   ├── app/api/v1/     routers (one module per endpoint group) + deps.py
│   ├── app/database/   base, session, models/, repositories/, migrations/ (Alembic)
│   ├── app/identity/   auth + users services
│   ├── app/audit/      append-only audit service
│   ├── app/credentials/ encrypted provider credentials
│   ├── app/providers/  provider catalog (+ adapters from Phase 2)
│   └── tests/          unit/, integration/ (real TimescaleDB + Redis)
├── frontend/           Next.js App Router terminal UI
│   ├── app/(terminal)/ authenticated pages; app/login public
│   ├── components/ui   shadcn-pattern primitives; components/<domain> feature components
│   ├── lib/            navigation registry, formatting, utils
│   ├── services/api/   typed API client (cookie auth, CSRF header, single-flight refresh)
│   └── stores/, hooks/
├── docs/               architecture, database, API, roadmap, compliance, providers
└── infrastructure/     docker, monitoring
```

## Commands

Backend (from `aethertrade-ai/backend`):

```bash
uv sync                                   # install
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest                             # needs TimescaleDB + Redis (see below)
uv run alembic upgrade head               # apply migrations
uv run python -m app.cli create-owner --email you@example.com --name "Owner"
uv run uvicorn app.main:app --reload
```

Test services: `docker compose up -d db redis` from `aethertrade-ai/`, or set
`AETHER_TEST_DATABASE_URL` / `AETHER_TEST_REDIS_URL`. Tests create and migrate a dedicated
`aethertrade_test` database.

Frontend (from `aethertrade-ai/frontend`):

```bash
npm ci
npm run lint && npm run typecheck && npm test
npm run build
npm run dev                               # proxies /api/v1 to AETHER_BACKEND_URL (default http://localhost:8000)
E2E_EMAIL=… E2E_PASSWORD=… npm run e2e    # Playwright against a running stack (E2E_BASE_URL, default :3000)
```

Full stack: `docker compose up --build` from `aethertrade-ai/`.

## Checklists

**New endpoint:** router in `app/api/v1/endpoints/`, Pydantic request/response schemas, permission
dependency, audit event for state changes, problem+json errors, API test (happy path + auth + validation),
update `docs/API_SPECIFICATION.md`.

**Schema change:** model in `app/database/models/`, new Alembic revision (`uv run alembic revision -m …`,
review the autogenerate output by hand), constraints and indexes named by convention, migration
round-trip test still passes, update `docs/DATABASE_DESIGN.md`.

**New market data provider (Phase 2+):** verify docs and licence in
`docs/providers/PROVIDER_EVALUATION.md` first; implement the `MarketDataProvider` protocol with explicit
capabilities; normalize to the common schema; health check; tests from recorded responses (no network
in tests); flip `adapter_status` in the catalog only when the adapter works end-to-end.

**New indicator / metric:** pure function in `app/quant` or `app/backtesting/metrics`, docstring with
the formula and warm-up behaviour, reference test with hand-computed values, look-ahead test.

**New strategy:** immutable version with parameters schema; backtest via the event-driven engine with a
versioned cost model; validation follows `docs/PROJECT_PLAN.md` §5.

**New agent:** typed input/output schemas, deterministic tools only, evidence IDs for every claim,
budget limits, persisted agent run, prompt-injection test when it reads external text.

**Frontend module:** register in `lib/navigation.ts`; data components take a `dataMode` and show
`DataModeBadge`; empty and error states are explicit; tabular-nums for figures; works at 375 px width.

## Pitfalls already paid for

- **FastAPI cookies + exceptions:** cookies set on an injected `Response` are discarded when the handler
  raises. To clear cookies on an error, *return* `problem_response(...)` with the cookies applied (see
  `/auth/refresh`).
- **Refresh races:** two tabs can refresh at once. The loser gets `401 session-rotated` and cookies are
  left alone; the client retries its request once (`services/api/client.ts`). Do not "simplify" either
  side.
- **Rate-limit keys:** never key on a raw email or trust `X-Forwarded-For`; keep the per-account
  all-IP failure limit.
- **Test transactions:** each test runs inside a rolled-back outer transaction with
  `join_transaction_mode="create_savepoint"`; services may `commit()` freely.
- **Next.js 16:** request middleware lives in `proxy.ts`; React Compiler lint rules forbid synchronous
  `setState` in effects and reading refs during render. Initialise local form state from props in a
  child component instead.
- **Next.js standalone:** `outputFileTracingRoot` is pinned because the repository root holds the poster
  app's `package-lock.json`. The standalone server renames its process to `next-server` (`pkill -f`
  will not find it; free the port instead), and `.next/static` must be copied into a *clean*
  `.next/standalone/.next/static`.
- **tailwind-merge:** custom font sizes (e.g. `text-2xs`) must be registered in `lib/utils.ts` or they
  are dropped when merged with a text colour.
- **Docker behind a TLS-inspecting proxy:** `docker build --network host --build-arg HTTPS_PROXY=…
  --secret id=extra_ca,src=<ca.pem>`; the Dockerfiles consume the optional secret without persisting it.
- **Compose secrets:** compose refuses to run while required secrets are missing, so generate keys with
  plain Python (see `.env.example`), not with `docker compose run`.

## Definition of done

Functionality + validation + error handling + tests pass + docs updated. Report incomplete work
honestly in the roadmap; a UI without a working backend is not done.
