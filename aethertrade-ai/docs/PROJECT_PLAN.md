# AetherTrade AI — Project Plan

Status: **Phases 0 and 1 complete; Phase 2 (market data) is next.** Last reviewed: 2026-11-22.

## 1. What we are building

AetherTrade AI is a single-user, multi-market **quantitative research and paper-trading platform**. It
watches markets, computes deterministic analytics, researches strategies, backtests them with realistic
costs, paper-trades the survivors and measures whether they keep working out of sample.

It is **not** an execution system and **not** an advice service:

| In scope (initial product) | Out of scope (initial product) |
| --- | --- |
| Market data ingestion, normalization, quality checks | Any real-money order placement |
| Deterministic indicators, analytics, regime detection | Broker order APIs (adapters are data-only) |
| Strategy research, versioning, backtesting, optimization | Recommendations published to third parties |
| Multi-agent AI research with evidence and supervision | LLM-generated numbers of any kind |
| Paper portfolios, strategy tournaments, risk veto | Guaranteed or "expected" return claims |
| Monte Carlo projections with explicit uncertainty | Multi-tenant SaaS |

The platform must be willing to say **NO TRADE**. A research run that finds nothing defensible and says
so is a successful run.

## 2. Repository context (Phase 0 finding)

The repository `dfasdf` already contained an unrelated, working Expo/React Native application
("Billawar Association Mumbai — Poster Studio", 98 passing domain tests) at the repository root.

Decision: **AetherTrade AI lives entirely in `aethertrade-ai/`** and does not modify the poster
application. The master prompt's own layout is rooted at `aethertrade-ai/`, and the rule "do not
overwrite existing working code" applies. If the project is later moved to its own repository,
`aethertrade-ai/` moves as-is (plus `.claude/skills/aethertrade-ai/` and the CI workflow).

## 3. The 30–50 % monthly return objective

The objective is treated as a **hypothesis to test**, never as a target the system is tuned to report.

| Monthly return | Compounded over 12 months | ₹1,00,000 becomes |
| --- | --- | --- |
| 2 % | 1.27× | ₹1,26,824 |
| 5 % | 1.80× | ₹1,79,586 |
| 30 % | 23.3× | ₹23,29,809 |
| 50 % | 129.7× | ₹1,29,74,634 |

Sustained returns of 30–50 % per month are far outside the documented long-run performance of
professional funds. In the segment most often used to chase them — Indian index options — SEBI's
September 2024 study of FY22–FY24 reported that about 93 % of individual F&O traders lost money after
costs. The platform therefore:

1. Never displays a return figure without labelling it **historical**, **simulated (backtest)**,
   **projected (Monte Carlo)** or **realized (paper)**.
2. Reports the **probability** of reaching a target under the empirically observed return distribution
   (from out-of-sample backtests and paper trading), alongside the probability of loss and of a given
   drawdown.
3. Evaluates strategies with a **pre-registered protocol** (§5) so that a high number produced by
   overfitting cannot be promoted.
4. Treats aggressive targets as a reason to increase scrutiny (leverage, tail risk, liquidity), not to
   relax it.

## 4. Success criteria

| Pillar | The platform is successful when… |
| --- | --- |
| Data accuracy | Every stored record carries provider, data mode (live / delayed / historical / fixture), quality status, event and ingestion timestamps; fixtures are never shown unlabelled. |
| Quant correctness | Every indicator and metric has a reference test (hand-computed or cross-checked against an independent implementation). |
| Research integrity | Every AI claim links to stored evidence; the supervisor rejects reports with unsupported numbers. |
| Risk | No paper order can be created without an approving risk decision recorded in the database. |
| Reproducibility | Any backtest can be re-run from its stored strategy version, dataset fingerprint, cost-model version and seed and produce identical results. |
| Honesty | The UI shows "not implemented" or "no data" rather than placeholders that look like data. |
| Engineering | CI runs lint, type checks, unit, integration, API and migration tests on every change. |

## 5. Strategy validation protocol (pre-registered)

A strategy version can only reach `validated` status if **all** hold (thresholds are configuration,
versioned, and recorded on the validation record):

1. Out-of-sample period not used for any parameter choice (hold-out or walk-forward).
2. Net of the versioned transaction-cost model for its exchange and product (brokerage, statutory
   charges, slippage, spread).
3. Minimum trade count (default ≥ 100 trades out of sample, or a documented exception for
   low-frequency strategies with a correspondingly wider confidence interval).
4. Deflated Sharpe ratio (adjusted for the number of trials in the optimization run) above threshold.
5. Probability of backtest overfitting (CSCV) below threshold when an optimization was run.
6. Beats the relevant simple baseline (buy-and-hold of the benchmark, or a random-entry strategy with the
   same exposure and costs) by a statistically meaningful margin.
7. Monte Carlo (trade bootstrap) 5th-percentile drawdown within the risk budget.

ML models additionally must beat a simple baseline (e.g. logistic regression or a rule-based strategy) on
the same purged, embargoed cross-validation splits — complexity must earn its place.

## 6. External dependencies

| Dependency | Needed for | Owner action |
| --- | --- | --- |
| TimescaleDB 2.x on PostgreSQL 16 | All persistence | Provided by `docker-compose.yml` |
| Redis 7 | Rate limits, Celery broker, Redis Streams | Provided by `docker-compose.yml` |
| Market data accounts (Upstox / Zerodha Kite Connect / Twelve Data / Finnhub / CoinGecko / FMP / Alpha Vantage) | Phase 2+ | Create accounts, then add keys in **Settings → API Integrations** (stored encrypted). Subscription terms, limits and licensing are verified per provider in Phase 2. |
| SEC EDGAR | US fundamentals | No key; requires a descriptive User-Agent with contact details (configured by the owner). |
| Anthropic API key (optional) | LLM synthesis in Phase 4 | Optional; the research graph runs with deterministic outputs and a clearly labelled "LLM disabled" mode without it. |
| TA-Lib C library | Phase 3 indicators | Built in the backend Docker image; our own reference implementations are the test oracle. |

## 7. Risk register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Overfitting / data snooping | False confidence, real losses if ever traded | §5 protocol; trial counting; deflated Sharpe; PBO; hold-out discipline |
| Look-ahead / survivorship bias | Inflated backtests | Point-in-time storage (`available_at`), delisted instruments retained, next-bar execution default, unit tests that inject future data and assert it is not used |
| Provider data quality / gaps | Wrong analytics | Validation pipeline, quality status per record, gap detection, cross-provider reconciliation |
| Data licensing breach | Legal | Per-provider licence review (Phase 2); single-user personal use; no redistribution of raw data |
| LLM hallucination / prompt injection | Fabricated research | LLM never computes numbers; evidence IDs required; supervisor validation; untrusted content quarantined; tools allow-listed |
| Regulatory drift (SEBI, RBI, tax) | Incorrect assumptions | `docs/compliance/REGULATORY_NOTES.md`; effective-dated cost and tax rule sets with sources |
| Python 3.13 support in quant libraries (VectorBT, Backtrader, TA-Lib) | Build failures | Verified at the start of Phase 3; our own event-driven engine is the system of record |
| Scope creep | Nothing finished | Phase gates; "done" means functionality + validation + error handling + tests, never UI alone |
| Single maintainer | Knowledge loss | `SKILL.md`, ADRs, documentation kept current with each phase |

## 8. Phases

| Phase | Theme | Status |
| --- | --- | --- |
| 0 | Repository inspection, architecture, documentation, project skill | **Complete** |
| 1 | Foundation: backend, database, auth, design system, navigation, configuration | **Complete** (CI's first run pending), see the roadmap for known limitations |
| 2 | Market data: provider adapters, instrument registry, ingestion, validation, market pages, watchlists | Not started |
| 3 | Quant engine: indicators, analytics, regimes, strategy library, backtesting | Not started |
| 4 | AI intelligence: LangGraph orchestration, agents, evidence, supervisor, reports | Not started |
| 5 | Paper trading: portfolios, orders, fills, ledger, risk veto, tournaments | Not started |
| 6 | Optimization, Monte Carlo, projections, analytics, daily reports | Not started |
| 7 | Production hardening: monitoring, security review, backups, deployment | Not started |

The detailed, prioritized task breakdown with acceptance criteria is in
[`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md).
