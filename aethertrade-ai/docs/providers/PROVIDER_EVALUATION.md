# Market Data Provider Evaluation

**Status: NOT YET VERIFIED.** This is the Phase 2.1 worksheet. Nothing in the "verified" columns may be
filled from memory — each value needs a link to the provider's official documentation or terms and the
date it was checked. Until a row is verified, its adapter stays `not_implemented` in the provider
catalog (`backend/app/providers/catalog.py`).

## Checklist per provider

1. Official documentation URL and API version.
2. Supported endpoints (quotes, candles, instruments, option chains, fundamentals, news, streaming).
3. Markets / exchanges / asset classes actually covered.
4. Timeframes and historical depth per timeframe.
5. Live vs delayed (and delay length) per exchange and plan.
6. Authentication method and token lifetime.
7. Rate limits (per second / minute / day) and how limits are signalled (status codes, headers).
8. Subscription requirements and cost.
9. Storage, caching, display and redistribution restrictions.
10. Error model, outage/status page, health-check endpoint.

## Candidates

| Provider | Intended role | Secret fields (catalog) | Verified? | Notes to confirm |
| --- | --- | --- | --- | --- |
| Upstox API | NSE/BSE equities, F&O, MCX; possibly streaming | `api_key`, `api_secret`, `access_token` | ⬜ | Daily token flow; historical candle depth per interval; WebSocket feed format and limits |
| Zerodha Kite Connect | NSE/BSE/NFO/MCX quotes, historical, streaming | `api_key`, `api_secret`, `access_token` | ⬜ | Subscription cost and whether historical data is included; daily login; ticker limits |
| Twelve Data | Global equities, ETFs, forex, crypto, indices | `api_key` | ⬜ | Which exchanges are real-time vs delayed on each plan; Indian exchange coverage |
| Finnhub | US equities, news, fundamentals, economic calendar | `api_key` | ⬜ | Free vs paid coverage; news licensing |
| CoinGecko | Crypto prices, market data | `api_key` | ⬜ | Demo vs Pro key headers and limits; OHLC granularity by range |
| Financial Modeling Prep | Fundamentals, financial statements, ETFs | `api_key` | ⬜ | Point-in-time availability (filing dates) of statements |
| Alpha Vantage | Equities, FX, commodities, economic indicators | `api_key` | ⬜ | Daily request caps; adjusted vs raw series |
| SEC EDGAR | US filings, XBRL company facts | none (config: `user_agent`) | ⬜ | Fair-access rate limit; required User-Agent format |
| RBI / official economic sources | Policy rates, reference rates, macro series | none | ⬜ | Machine-readable endpoints vs publications; release calendars |
| Anthropic API (LLM, not market data) | Phase 4 synthesis | `api_key` | ⬜ | Model availability and structured-output support at implementation time |
