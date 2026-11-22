"""Catalog of external providers the platform can hold credentials for.

This is static metadata used by the API-key manager. ``adapter_status`` is the honest state of the
integration: every adapter is ``not_implemented`` until Phase 2 ships it end-to-end. ``intended_use``
describes what we *plan* to use the provider for — it is not a claim about the provider's coverage,
which is verified per provider in ``docs/providers/PROVIDER_EVALUATION.md``.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ProviderCategory(StrEnum):
    BROKER_DATA = "broker_data"
    MARKET_DATA = "market_data"
    FUNDAMENTALS = "fundamentals"
    REGULATORY_FILINGS = "regulatory_filings"
    LLM = "llm"


class AdapterStatus(StrEnum):
    NOT_IMPLEMENTED = "not_implemented"
    AVAILABLE = "available"


@dataclass(frozen=True)
class ProviderSpec:
    id: str
    name: str
    category: ProviderCategory
    intended_use: tuple[str, ...]
    secret_fields: tuple[str, ...]
    config_fields: tuple[str, ...]
    docs_url: str
    adapter_status: AdapterStatus = AdapterStatus.NOT_IMPLEMENTED


PROVIDERS: tuple[ProviderSpec, ...] = (
    ProviderSpec(
        id="upstox",
        name="Upstox API",
        category=ProviderCategory.BROKER_DATA,
        intended_use=("NSE/BSE equities", "Indian F&O", "MCX commodities"),
        secret_fields=("api_key", "api_secret", "access_token"),
        config_fields=("redirect_uri",),
        docs_url="https://upstox.com/developer/api-documentation/",
    ),
    ProviderSpec(
        id="zerodha_kite",
        name="Zerodha Kite Connect",
        category=ProviderCategory.BROKER_DATA,
        intended_use=("NSE/BSE equities", "Indian F&O", "MCX commodities"),
        secret_fields=("api_key", "api_secret", "access_token"),
        config_fields=("redirect_uri",),
        docs_url="https://kite.trade/docs/connect/v3/",
    ),
    ProviderSpec(
        id="twelve_data",
        name="Twelve Data",
        category=ProviderCategory.MARKET_DATA,
        intended_use=("Global equities and ETFs", "Forex reference rates", "Crypto", "Indices"),
        secret_fields=("api_key",),
        config_fields=(),
        docs_url="https://twelvedata.com/docs",
    ),
    ProviderSpec(
        id="finnhub",
        name="Finnhub",
        category=ProviderCategory.MARKET_DATA,
        intended_use=("US equities", "Company news", "Economic calendar"),
        secret_fields=("api_key",),
        config_fields=(),
        docs_url="https://finnhub.io/docs/api",
    ),
    ProviderSpec(
        id="coingecko",
        name="CoinGecko",
        category=ProviderCategory.MARKET_DATA,
        intended_use=("Crypto prices and market data",),
        secret_fields=("api_key",),
        config_fields=("plan",),
        docs_url="https://docs.coingecko.com/",
    ),
    ProviderSpec(
        id="financial_modeling_prep",
        name="Financial Modeling Prep",
        category=ProviderCategory.FUNDAMENTALS,
        intended_use=("Financial statements", "Valuation ratios", "ETF holdings"),
        secret_fields=("api_key",),
        config_fields=(),
        docs_url="https://site.financialmodelingprep.com/developer/docs",
    ),
    ProviderSpec(
        id="alpha_vantage",
        name="Alpha Vantage",
        category=ProviderCategory.MARKET_DATA,
        intended_use=("Equities", "Forex", "Commodities", "Economic indicators"),
        secret_fields=("api_key",),
        config_fields=(),
        docs_url="https://www.alphavantage.co/documentation/",
    ),
    ProviderSpec(
        id="sec_edgar",
        name="SEC EDGAR",
        category=ProviderCategory.REGULATORY_FILINGS,
        intended_use=("US company filings", "XBRL company facts"),
        secret_fields=(),
        config_fields=("user_agent",),
        docs_url="https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    ),
    ProviderSpec(
        id="anthropic",
        name="Anthropic Claude API",
        category=ProviderCategory.LLM,
        intended_use=("Optional LLM for research synthesis (Phase 4)",),
        secret_fields=("api_key",),
        config_fields=("model",),
        docs_url="https://docs.anthropic.com/",
    ),
)

_BY_ID = {p.id: p for p in PROVIDERS}


def get_provider(provider_id: str) -> ProviderSpec | None:
    return _BY_ID.get(provider_id)
