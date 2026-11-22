# Regulatory and Licensing Notes

> These notes are engineering guidance for building the product responsibly. They are **not legal or
> tax advice**. Regulations and tax rules change; every item below must be re-verified against the
> primary source (SEBI/RBI circulars, the Income-tax Act, exchange and provider terms) before relying on
> it, and with a qualified professional before any change in scope (sharing research, live trading).
> Last reviewed: 2026-11-22 (from prior knowledge, not yet re-verified against primary sources).

## 1. Product posture that keeps the regulatory surface small

1. **Single user, personal research.** The platform is used by its owner for their own research.
2. **No order execution.** No broker order API is called; adapters are data-only. Paper trading is
   simulation and is labelled as such everywhere.
3. **No distribution of recommendations.** Signals and reports are not published, sold or sent to
   other people.
4. **No performance claims.** The UI distinguishes historical, simulated, projected and realized
   returns and never presents a return as expected or guaranteed.

Changing any of these four is a scope change that requires a compliance review first.

## 2. India — SEBI

| Topic | Relevance | Engineering consequence |
| --- | --- | --- |
| SEBI (Research Analysts) Regulations, 2014 | Providing research reports or buy/sell recommendations to others generally requires RA registration. | Keep research private to the owner. If research is ever shared (even free, even to a small group), stop and obtain advice first. |
| SEBI (Investment Advisers) Regulations, 2013 | Advice for consideration (fee-based) requires registration. | Same as above. The UI language says "research candidate", not "advice". |
| Retail algorithmic trading framework (SEBI circular of February 2025 and subsequent exchange implementation standards) | Governs API-based order placement by retail investors via brokers (algo registration/IDs, static IPs, broker-side controls). | Not applicable while no orders are placed. Any future live-execution scope must be designed around the then-current framework and broker requirements. |
| SEBI restrictions on association with unregistered "finfluencers" (2024) and on past/expected return claims | Relevant if outputs or performance are ever published. | Do not publish performance or signals. |
| SEBI study on F&O losses (Sept 2024: ~93 % of individual F&O traders lost money, FY22–FY24) | Context for realistic expectations. | Shown in documentation; informs default risk limits for options strategies. |

## 3. India — RBI / FEMA (forex and overseas investing)

* Resident individuals may trade currency derivatives only on recognised Indian exchanges and only in
  permitted pairs (INR pairs and specified cross-currency pairs). Margin forex trading on overseas or
  online platforms is not permitted; RBI maintains an **Alert List** of unauthorised forex platforms.
* **Engineering consequence:** the Forex module is research-only. Market pages distinguish
  exchange-traded INR currency derivatives (NSE/BSE currency segment) from global OTC FX rates, which are
  shown as **reference data**, not as tradable instruments for an Indian resident.
* US equities / global ETFs: Indian residents invest abroad under the Liberalised Remittance Scheme
  (annual limit, TCS on remittances). The projection engine must not assume frictionless currency
  conversion — FX conversion costs and TCS are modelled as configurable parameters.

## 4. Crypto (India)

* Virtual digital asset gains are taxed at a flat 30 % without set-off of losses against other income,
  and 1 % TDS applies on transfers above thresholds (Sections 115BBH and 194S, Income-tax Act, 1961).
* VDA service providers must register with FIU-IND under PMLA.
* **Engineering consequence:** projection and paper-trading tax models for crypto must use these rules
  (effective-dated), and losses must not offset other gains in projections.

## 5. Taxes used by the projection engine (configurable, effective-dated)

| Income type | Rule (as last known, verify) |
| --- | --- |
| Listed equity, short-term (≤ 12 months, STT paid) | 20 % (Section 111A, for transfers on/after 23 July 2024) |
| Listed equity, long-term | 12.5 % above an annual exemption of ₹1.25 lakh (Section 112A, from 23 July 2024) |
| Intraday equity | Speculative business income, slab rates |
| F&O | Non-speculative business income, slab rates; turnover and audit rules apply |
| Crypto / VDA | 30 % flat + 1 % TDS (see §4) |

Tax rules are stored as data with `effective_from` and a source reference, never hard-coded. The UI
labels projected after-tax figures as estimates and recommends professional advice.

## 6. Market data licensing

| Source | Consideration |
| --- | --- |
| NSE / BSE data | Real-time and delayed exchange data is licensed; redistribution requires an exchange data licence. Personal display via a broker API is typically covered by the broker's terms for the account holder only. |
| Broker APIs (Upstox, Zerodha Kite Connect) | Terms generally restrict use to the account holder and prohibit redistribution or resale of data. Access tokens expire daily and require an interactive login — the platform must not automate around the broker's login flow in ways the terms prohibit. |
| Commercial data APIs (Twelve Data, Finnhub, FMP, Alpha Vantage, CoinGecko) | Plans differ on real-time vs delayed data, exchanges covered, request limits, commercial use, caching and display. Recorded per provider in Phase 2. |
| SEC EDGAR | Public data; the SEC fair-access policy requires a declared User-Agent and limits request rates. |
| News | Store headline, summary, link and metadata; avoid storing or displaying full article text unless the licence permits. Always link to the original source. |

**Engineering consequence:** every provider row in `docs/providers/PROVIDER_EVALUATION.md` records its
licence constraints, and the storage layer records the provider on every record so data can be purged
per provider if a licence requires it.

## 7. Data protection

* The platform stores the owner's email, password hash, IP addresses in audit logs and broker API keys.
  India's Digital Personal Data Protection Act, 2023 applies to personal data processing; for a
  single-user personal deployment the practical obligations are security safeguards and minimal
  retention.
* API keys are encrypted at rest (Fernet/MultiFernet) with keys held outside the database, never logged,
  never returned by the API and never placed in an LLM context.
