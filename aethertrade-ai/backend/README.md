# AetherTrade AI — backend

FastAPI application, Alembic migrations and tests. See the project [README](../README.md) for setup and
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the design.

```bash
uv sync
uv run ruff check . && uv run ruff format --check . && uv run mypy app tests
uv run pytest                     # needs TimescaleDB + Redis: docker compose up -d db redis
uv run uvicorn app.main:create_app --factory --reload
```
