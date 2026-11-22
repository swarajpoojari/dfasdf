import {
  Activity,
  ChartLine,
  ChartPie,
  Bitcoin,
  BrainCircuit,
  Briefcase,
  CandlestickChart,
  FileText,
  FlaskConical,
  Gauge,
  Globe2,
  Landmark,
  Layers,
  type LucideIcon,
  Newspaper,
  Settings,
  Star,
  Wheat,
  ArrowLeftRight,
} from "lucide-react";

/**
 * Module registry: the single source of truth for navigation, the command palette and module pages.
 *
 * `status` must stay honest:
 *   available — the module's functionality works end to end
 *   partial   — some functionality works; `implemented` lists exactly what
 *   planned   — nothing is implemented yet; the page shows scope and the delivering phase
 */
export type ModuleStatus = "available" | "partial" | "planned";

export type NavGroup = "Overview" | "Markets" | "Research" | "Quant Lab" | "Trading" | "System";

export interface ModuleDefinition {
  id: string;
  title: string;
  shortTitle?: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  phase: number;
  status: ModuleStatus;
  description: string;
  capabilities: string[];
  implemented?: string[];
  /** Provider catalog ids whose readiness is relevant to this module. */
  providers?: string[];
  keywords?: string[];
}

export const NAV_GROUPS: NavGroup[] = ["Overview", "Markets", "Research", "Quant Lab", "Trading", "System"];

export const MODULES: ModuleDefinition[] = [
  {
    id: "dashboard",
    title: "Overview Dashboard",
    shortTitle: "Overview",
    href: "/dashboard",
    icon: Gauge,
    group: "Overview",
    phase: 2,
    status: "partial",
    description: "Capital, P&L, equity curve, market overview, research opportunities and risk at a glance.",
    capabilities: [
      "Total virtual capital; daily, weekly and monthly paper P&L",
      "Portfolio equity curve and drawdown",
      "Global indices and market overview",
      "Top AI research candidates and strategy leaderboard",
      "Current risk exposure and market sentiment",
      "News feed and AI daily briefing",
    ],
    implemented: [
      "Live platform readiness (database, Redis, stored provider keys, adapter status)",
      "Configured default paper capital",
    ],
    keywords: ["home", "summary", "pnl"],
  },
  {
    id: "markets",
    title: "Global Markets",
    href: "/markets",
    icon: Globe2,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "Cross-asset view of indices, rates, currencies, commodities and crypto with data provenance.",
    capabilities: [
      "Global index board with session status from exchange calendars",
      "Cross-asset movers, volatility and breadth",
      "Every figure labelled live, delayed, historical or fixture",
    ],
    providers: ["twelve_data", "alpha_vantage", "finnhub"],
  },
  {
    id: "india",
    title: "Indian Market Explorer",
    shortTitle: "India (NSE/BSE)",
    href: "/markets/india",
    icon: Landmark,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "NSE and BSE equities: instrument registry, quotes, candles, corporate actions and screens.",
    capabilities: [
      "Instrument search across NSE and BSE with ISIN mapping",
      "Quotes and historical candles with exchange holiday calendars",
      "Corporate actions and point-in-time adjusted series",
      "Sector and index constituents",
    ],
    providers: ["upstox", "zerodha_kite"],
    keywords: ["nse", "bse", "nifty", "sensex"],
  },
  {
    id: "fno",
    title: "Futures & Options",
    shortTitle: "F&O",
    href: "/markets/fno",
    icon: Layers,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "Indian derivatives: contract browser, option chains, open interest and expiry calendar.",
    capabilities: [
      "Contract specifications (lot size, tick size, expiry) as of each date",
      "Option chain snapshots with implied volatility and greeks (source stated)",
      "Open interest and rollover analytics",
      "Defined-risk options strategy research (Phase 3)",
    ],
    providers: ["upstox", "zerodha_kite"],
    keywords: ["derivatives", "options", "futures", "nifty", "banknifty", "expiry"],
  },
  {
    id: "forex",
    title: "Forex",
    href: "/markets/forex",
    icon: ArrowLeftRight,
    group: "Markets",
    phase: 2,
    status: "planned",
    description:
      "Exchange-traded INR currency derivatives, and global FX rates shown as reference data for research.",
    capabilities: [
      "INR pairs and permitted cross-currency pairs on Indian exchanges",
      "Global OTC rates labelled as reference data (not tradable for Indian residents)",
      "Point-in-time FX for multi-currency portfolio conversion",
    ],
    providers: ["upstox", "zerodha_kite", "twelve_data", "alpha_vantage"],
    keywords: ["fx", "currency", "usdinr"],
  },
  {
    id: "crypto",
    title: "Cryptocurrency",
    shortTitle: "Crypto",
    href: "/markets/crypto",
    icon: Bitcoin,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "Crypto spot markets with venue-level provenance; research and paper trading only.",
    capabilities: [
      "Spot prices and OHLC by venue",
      "Market capitalisation, volume and volatility",
      "Indian VDA tax rules applied in projections (Phase 6)",
    ],
    providers: ["coingecko", "twelve_data"],
    keywords: ["bitcoin", "btc", "eth", "vda"],
  },
  {
    id: "commodities",
    title: "Commodities",
    href: "/markets/commodities",
    icon: Wheat,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "MCX contracts and global commodity benchmarks with contract-month awareness.",
    capabilities: [
      "MCX futures with rollover-aware continuous series",
      "Global benchmarks (energy, metals, agriculture) as reference data",
      "Supply and demand context from the macro agent (Phase 4)",
    ],
    providers: ["upstox", "zerodha_kite", "alpha_vantage"],
    keywords: ["mcx", "gold", "crude", "silver"],
  },
  {
    id: "us",
    title: "US Equities",
    href: "/markets/us",
    icon: CandlestickChart,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "US-listed equities with SEC filings and fundamentals; LRS costs modelled for Indian residents.",
    capabilities: [
      "Quotes and candles for NYSE and Nasdaq listings",
      "SEC EDGAR filings and XBRL company facts (Phase 4)",
      "FX conversion and remittance costs in projections",
    ],
    providers: ["finnhub", "twelve_data", "financial_modeling_prep", "sec_edgar"],
    keywords: ["nasdaq", "nyse", "sp500"],
  },
  {
    id: "etfs",
    title: "Global ETFs",
    shortTitle: "ETFs",
    href: "/markets/etfs",
    icon: ChartPie,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "Indian and global ETFs with holdings, tracking and cost analysis.",
    capabilities: ["ETF screener", "Holdings and exposure breakdown", "Tracking difference versus benchmark"],
    providers: ["twelve_data", "financial_modeling_prep"],
  },
  {
    id: "watchlists",
    title: "Watchlists",
    href: "/watchlists",
    icon: Star,
    group: "Markets",
    phase: 2,
    status: "planned",
    description: "Personal instrument lists with live provenance-labelled quotes.",
    capabilities: ["Create and order watchlists", "Quotes with staleness indicators", "Alerts (Phase 4)"],
  },
  {
    id: "intelligence",
    title: "AI Intelligence Center",
    shortTitle: "AI Intelligence",
    href: "/intelligence",
    icon: BrainCircuit,
    group: "Research",
    phase: 4,
    status: "planned",
    description:
      "Multi-agent research: agent status, task queue, approved and rejected candidates, evidence and logs.",
    capabilities: [
      "Agent status, current tasks and research queue",
      "Completed scans, approved candidates and rejected signals with reasons",
      "Evidence and source references for every claim",
      "Agent execution logs and token budgets",
      "Explicit NO TRADE outcomes",
    ],
    providers: ["anthropic"],
    keywords: ["agents", "langgraph", "signals", "research"],
  },
  {
    id: "news",
    title: "News & Events",
    href: "/news",
    icon: Newspaper,
    group: "Research",
    phase: 4,
    status: "planned",
    description: "Deduplicated financial news linked to instruments, with event classification and source links.",
    capabilities: [
      "News deduplication and entity linking",
      "Event classification and sentiment (model version stated)",
      "Economic calendar: RBI, Fed, inflation releases",
      "Original source link on every item",
    ],
    providers: ["finnhub"],
    keywords: ["calendar", "macro", "rbi", "fed"],
  },
  {
    id: "reports",
    title: "Research Reports",
    href: "/reports",
    icon: FileText,
    group: "Research",
    phase: 4,
    status: "planned",
    description: "Supervisor-validated research reports and the automated daily briefing.",
    capabilities: ["Daily briefing", "Instrument and strategy reports", "Supervisor verdicts and evidence"],
    keywords: ["briefing"],
  },
  {
    id: "strategies",
    title: "Strategy Laboratory",
    shortTitle: "Strategy Lab",
    href: "/strategies",
    icon: FlaskConical,
    group: "Quant Lab",
    phase: 3,
    status: "planned",
    description: "Strategy library, builder, parameters, immutable version history and comparison.",
    capabilities: [
      "Technical, statistical, options and ML strategy library",
      "Parameter schemas and immutable versions",
      "Validation against the pre-registered protocol",
      "Optimization with trial accounting (Phase 6)",
    ],
    keywords: ["ema", "rsi", "macd", "versions"],
  },
  {
    id: "backtesting",
    title: "Backtesting",
    href: "/backtesting",
    icon: Activity,
    group: "Quant Lab",
    phase: 3,
    status: "planned",
    description: "Event-driven backtests with versioned cost models, walk-forward and Monte Carlo validation.",
    capabilities: [
      "Next-bar fills, liquidity caps, stops and targets",
      "Indian statutory charges and slippage from versioned cost models",
      "In-sample, out-of-sample and walk-forward runs",
      "Reproducible runs: dataset fingerprint, engine version and seed",
    ],
    keywords: ["walk-forward", "monte carlo", "sharpe"],
  },
  {
    id: "analytics",
    title: "Performance Analytics",
    shortTitle: "Analytics",
    href: "/analytics",
    icon: ChartLine,
    group: "Quant Lab",
    phase: 6,
    status: "planned",
    description:
      "Risk-adjusted performance, return projections with percentile bands, and portfolio risk analytics.",
    capabilities: [
      "Sharpe, Sortino, Calmar, drawdown, expectancy, profit factor",
      "Monte Carlo projections: 5th–95th percentiles, probability of loss and of reaching a target",
      "Historical, simulated, projected and realized returns kept visibly separate",
    ],
    keywords: ["projection", "drawdown", "risk"],
  },
  {
    id: "portfolio",
    title: "Paper Portfolio",
    href: "/portfolio",
    icon: Briefcase,
    group: "Trading",
    phase: 5,
    status: "planned",
    description: "Virtual portfolios with a decimal ledger, simulated fills, risk veto and strategy tournaments.",
    capabilities: [
      "Virtual balance, open positions and closed trades",
      "Realized and unrealized P&L including all trading costs",
      "Every order linked to its signal, strategy version, risk decision and market data",
      "Strategy tournaments on identical market data",
    ],
    keywords: ["paper", "positions", "orders", "pnl"],
  },
  {
    id: "settings",
    title: "Settings & API Integrations",
    shortTitle: "Settings",
    href: "/settings",
    icon: Settings,
    group: "System",
    phase: 1,
    status: "partial",
    description: "Preferences, encrypted API keys, security and system status.",
    capabilities: [
      "Preferences: base currency, timezone, number format, default paper capital",
      "Encrypted provider API keys (never displayed after saving)",
      "Password change and audit log",
      "System health and execution mode",
      "Provider connectivity tests (Phase 2)",
    ],
    implemented: [
      "Preferences",
      "Encrypted provider API keys",
      "Password change and audit log",
      "System health and execution mode",
    ],
    keywords: ["preferences", "api keys", "credentials", "security", "audit"],
  },
];

export function moduleById(id: string): ModuleDefinition {
  const found = MODULES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown module: ${id}`);
  return found;
}

export function moduleForPath(pathname: string): ModuleDefinition | undefined {
  // Longest matching href wins so /markets/india does not resolve to /markets.
  return [...MODULES]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));
}

export function searchModules(query: string): ModuleDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return MODULES;
  const terms = q.split(/\s+/);
  return MODULES.filter((m) => {
    const haystack = [m.title, m.shortTitle, m.group, m.description, ...(m.keywords ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
