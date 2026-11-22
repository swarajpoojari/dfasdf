import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatCompactMoney,
  formatDecimal,
  formatMoney,
  formatSignedPercent,
  isDecimalString,
} from "@/lib/format";
import { safeNextPath } from "@/lib/safe-redirect";
import { validateCapital } from "@/components/settings/preferences-form";

describe("formatMoney", () => {
  it("uses Indian digit grouping for INR", () => {
    expect(formatMoney("100000.00", "INR")).toBe("₹1,00,000.00");
    expect(formatMoney("12345678.5", "INR")).toBe("₹1,23,45,678.50");
  });

  it("uses international grouping for USD", () => {
    expect(formatMoney("100000", "USD")).toBe("$100,000.00");
  });

  it("formats decimal strings exactly, without float rounding", () => {
    // 0.1 + 0.2 style artefacts must never appear; strings beyond float precision stay exact.
    expect(formatMoney("90071992547409.93", "USD")).toBe("$90,071,992,547,409.93");
    expect(formatDecimal("0.30", "en-US")).toBe("0.30");
  });

  it("uses a typographic minus for negatives", () => {
    expect(formatMoney("-2500.5", "INR")).toBe("−₹2,500.50");
  });

  it("rejects values that are not decimal strings", () => {
    expect(() => formatMoney("1e5", "INR")).toThrow(/decimal string/);
    expect(() => formatMoney("NaN", "INR")).toThrow();
    expect(isDecimalString("12.50")).toBe(true);
    expect(isDecimalString("12.")).toBe(false);
  });
});

describe("formatCompactMoney", () => {
  it("uses lakh and crore for INR", () => {
    expect(formatCompactMoney("150000", "INR")).toBe("₹1.50 L");
    expect(formatCompactMoney("23298085", "INR")).toBe("₹2.33 Cr");
    expect(formatCompactMoney("-150000", "INR")).toBe("−₹1.50 L");
    expect(formatCompactMoney("99999", "INR")).toBe("₹99,999");
  });
});

describe("formatSignedPercent", () => {
  it("signs ratios and handles zero and non-finite values", () => {
    expect(formatSignedPercent(0.0123)).toBe("+1.23%");
    expect(formatSignedPercent(-0.05)).toBe("−5.00%");
    expect(formatSignedPercent(0)).toBe("0.00%");
    expect(formatSignedPercent(-0.00001)).toBe("0.00%");
    expect(formatSignedPercent(Number.NaN)).toBe("—");
  });
});

describe("formatClock", () => {
  it("renders exchange-local time from a UTC instant", () => {
    const instant = new Date("2026-11-22T03:45:00Z"); // 09:15 IST, NSE open
    expect(formatClock(instant, "Asia/Kolkata")).toBe("09:15:00");
    expect(formatClock(instant, "UTC", false)).toBe("03:45");
  });
});

describe("safeNextPath", () => {
  it.each([
    [null, "/dashboard"],
    ["/settings?tab=security", "/settings?tab=security"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example/path", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["/login", "/dashboard"],
    ["/api/v1/auth/logout", "/dashboard"],
  ])("safeNextPath(%s) → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("validateCapital", () => {
  it("enforces paise precision and the configured bounds", () => {
    expect(validateCapital("75000.50", "50000.00", "100000.00")).toBeNull();
    expect(validateCapital("50000", "50000.00", "100000.00")).toBeNull();
    expect(validateCapital("49999.99", "50000.00", "100000.00")).toMatch(/between/);
    expect(validateCapital("100000.01", "50000.00", "100000.00")).toMatch(/between/);
    expect(validateCapital("75000.123", "50000.00", "100000.00")).toMatch(/two decimal/);
    expect(validateCapital("abc", "50000.00", "100000.00")).toMatch(/two decimal/);
  });
});
