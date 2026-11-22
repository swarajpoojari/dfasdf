/**
 * Number and time formatting for the terminal.
 *
 * Money arrives from the API as decimal strings. Intl.NumberFormat formats numeric strings exactly
 * (ECMA-402 "Intl.NumberFormat v3"), so values are never routed through a binary float on the way to
 * the screen.
 */

export type CurrencyCode = "INR" | "USD";
export type NumberLocale = "en-IN" | "en-US";

const MINUS = "−"; // typographic minus sign, same width as "+" in tabular figures
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function isDecimalString(value: string): boolean {
  return DECIMAL_PATTERN.test(value);
}

function assertDecimal(value: string): void {
  if (!isDecimalString(value)) {
    throw new Error(`Not a decimal string: ${JSON.stringify(value)}`);
  }
}

// Intl.NumberFormat.prototype.format accepts strings at runtime; the TS lib types lag behind.
type StringFormatter = { format(value: string | number): string };

export function formatMoney(
  value: string,
  currency: CurrencyCode,
  locale: NumberLocale = currency === "INR" ? "en-IN" : "en-US",
  fractionDigits = 2,
): string {
  assertDecimal(value);
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }) as unknown as StringFormatter;
  return formatter.format(value).replace("-", MINUS);
}

export function formatDecimal(value: string, locale: NumberLocale = "en-IN", fractionDigits = 2): string {
  assertDecimal(value);
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }) as unknown as StringFormatter;
  return formatter.format(value).replace("-", MINUS);
}

/** Signed percentage from a ratio (0.0123 → "+1.23%"). Analytics values are plain numbers. */
export function formatSignedPercent(ratio: number, fractionDigits = 2): string {
  if (!Number.isFinite(ratio)) return "—";
  const pct = (ratio * 100).toFixed(fractionDigits);
  if (Number(pct) === 0) return `${(0).toFixed(fractionDigits)}%`;
  return ratio > 0 ? `+${pct}%` : `${MINUS}${pct.slice(1)}%`;
}

/** Indian short scale for INR (lakh / crore), international for USD. */
export function formatCompactMoney(value: string, currency: CurrencyCode): string {
  assertDecimal(value);
  const n = Number(value); // display-only approximation, explicitly labelled compact
  const sign = n < 0 ? MINUS : "";
  const abs = Math.abs(n);
  if (currency === "INR") {
    if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
    return formatMoney(value, "INR", "en-IN", 0);
  }
  const compact = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  });
  return compact.format(abs).replace(/^/, sign);
}

export function formatClock(date: Date, timeZone: string, withSeconds = true): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(date);
}

export function formatTimestamp(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}
