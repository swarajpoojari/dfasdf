# AetherTrade AI

A single-user, multi-market **quantitative research and paper-trading platform**: market data with
provenance, deterministic analytics, strategy research and backtesting, evidence-bound AI research
agents, and a paper-trading engine with a mandatory risk veto.

> **Research and simulation only.** AetherTrade cannot place real orders, and nothing it produces is
> investment advice. Returns are always labelled as historical, simulated, projected or realized, and
> "no trade" is a first-class outcome. See [`docs/compliance/REGULATORY_NOTES.md`](docs/compliance/REGULATORY_NOTES.md).

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Repository inspection, architecture, documentation, project skill | ✅ Complete |
| 1 | Foundation: backend, database, auth, security, design system, navigation, settings, infrastructure | ✅ Complete (CI workflow pending its first run on GitHub) |
| 2 | Market data: provider adapters, instrument registry, ingestion, validation, market pages | Not started |
| 3–7 | Quant engine, AI agents, paper trading, optimization, hardening | Not started |

**What works today:** sign-in (no public sign-up), role-based access, hardened session cookies with
rotating refresh tokens, rate limiting, an append-only audit log, encrypted storage of provider API keys,
user preferences, health/readiness, and the full terminal shell with all 18 modules.

**What does not exist yet:** any market data, analytics, strategies, backtests, AI agents or paper
trades. Module pages for those say so and name the phase that delivers them; the UI never shows sample
or placeholder figures. Every provider in Settings is reported as *adapter not implemented*.

The detailed task list with acceptance criteria and known limitations is in
[`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md).

## Quick start (Docker)

Requirements: Docker with Compose v2.

```bash
cd aethertrade-ai
cp .env.example .env
# Fill in the required secrets in .env:
#   AETHER_JWT_SECRET               python3 -c "import secrets; print(secrets.token_urlsafe(48))"
#   AETHER_SECRETS_ENCRYPTION_KEYS  python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
#   POSTGRES_PASSWORD               any strong value
docker compose up --build -d
docker compose run --rm api python -m app.cli create-user --email you@example.com --name "Your Name"
```

Open <http://localhost:3000> (API docs: <http://localhost:8000/api/docs>). Ports bind to 127.0.0.1.

The stack: TimescaleDB 2.32 (PostgreSQL 16), Redis 7.4, a one-shot `migrate` job (Alembic), the
FastAPI `api` and the Next.js `web` terminal. Containers run as non-root; startup is gated on health
checks. Compose refuses to start if a required secret is missing.

Building behind a TLS-inspecting proxy: pass its CA bundle as an optional BuildKit secret, e.g.
`docker build --secret id=extra_ca,src=/path/to/ca.pem backend`. It is never written to an image layer.

## Local development

```bash
# Services
docker compose up -d db redis

# Backend (Python 3.13, uv)
cd backend
uv sync
cp ../.env.example .env            # then fill in the secrets
uv run alembic upgrade head
uv run python -m app.cli create-user --email you@example.com --name "Owner"
uv run uvicorn app.main:create_app --factory --reload

# Frontend (Node 22)
cd frontend
npm ci
npm run dev                         # proxies /api/v1 to AETHER_BACKEND_URL (default http://localhost:8000)
```

## Verification

| Check | Command | Result at the end of Phase 1 |
| --- | --- | --- |
| Backend lint + format | `uv run ruff check . && uv run ruff format --check .` | clean |
| Backend types | `uv run mypy app tests` (strict) | clean, 60 files |
| Backend tests | `uv run pytest` (real TimescaleDB + Redis) | 99 passed |
| Frontend lint / types | `npm run lint && npm run typecheck` | clean |
| Frontend unit tests | `npm test` | 53 passed |
| Frontend build | `npm run build` | 22 routes |
| End-to-end | `E2E_EMAIL=… E2E_PASSWORD=… npm run e2e` | 3 passed, against both a local stack and the Docker Compose stack |

The backend suite includes API tests for every Phase 1 endpoint, migration round-trip and model/migration
drift checks, database-enforced audit immutability, and refresh-token theft detection. Two
security checks (CSRF enforcement and token revocation) were mutation-tested: disabling either one makes
its test fail.

## Repository layout

```
aethertrade-ai/
├── backend/        FastAPI app, Alembic migrations, tests (uv project)
├── frontend/       Next.js App Router terminal, unit tests (Vitest), e2e (Playwright)
├── docs/           architecture, database, API, roadmap, compliance, providers
├── docker-compose.yml
├── .env.example
└── SKILL.md        working rules for this codebase (also loaded as a Claude Code project skill)
```

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) | Scope, success criteria, validation protocol, risks |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, policies (numbers, time, provenance), security, AI architecture |
| [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) | Schema for every domain, conventions, immutability rules |
| [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md) | Conventions, implemented endpoints, planned groups, WebSocket protocol |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | Prioritized tasks, acceptance criteria, status, known limitations |
| [`docs/compliance/REGULATORY_NOTES.md`](docs/compliance/REGULATORY_NOTES.md) | SEBI, RBI/FEMA, tax and data-licensing considerations |
| [`docs/providers/PROVIDER_EVALUATION.md`](docs/providers/PROVIDER_EVALUATION.md) | Provider due-diligence worksheet (Phase 2) |
| [`SKILL.md`](SKILL.md) | Invariants, commands and checklists for contributors |
