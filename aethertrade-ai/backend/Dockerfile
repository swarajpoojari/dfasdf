# syntax=docker/dockerfile:1.7
# AetherTrade API image: FastAPI app + Alembic migrations. Runs as a non-root user.
#
# Building behind a TLS-inspecting proxy: pass its CA bundle as a BuildKit secret (never stored in a
# layer), e.g. `docker build --secret id=extra_ca,src=/path/to/ca.pem .` The secret is optional.

ARG PYTHON_VERSION=3.13

FROM python:${PYTHON_VERSION}-slim AS builder
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export PIP_CERT=/run/secrets/extra_ca; fi; \
    pip install --no-cache-dir uv==0.11.32

# Dependencies first (cached unless the lockfile changes), then the project itself.
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export SSL_CERT_FILE=/run/secrets/extra_ca; fi; \
    uv sync --frozen --no-dev --no-install-project
COPY alembic.ini ./
COPY app ./app
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export SSL_CERT_FILE=/run/secrets/extra_ca; fi; \
    uv sync --frozen --no-dev

FROM python:${PYTHON_VERSION}-slim AS runtime
ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN useradd --system --uid 10001 --home-dir /app --shell /usr/sbin/nologin aether
WORKDIR /app
COPY --from=builder --chown=root:root /app /app
USER aether
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/system/health/live', timeout=2).status == 200 else 1)"]
# Proxy headers are deliberately NOT trusted (uvicorn default trusts only 127.0.0.1). Configure
# FORWARDED_ALLOW_IPS only with the exact address of a reverse proxy you control (Phase 7).
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
