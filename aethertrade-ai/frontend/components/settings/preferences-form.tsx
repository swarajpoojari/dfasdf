"use client";

import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";

import { QueryError } from "@/components/shared/query-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/primitives";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-session";
import { formatMoney, isDecimalString } from "@/lib/format";
import { ApiError } from "@/services/api/client";
import type { Preferences, PreferencesUpdate } from "@/services/api/schemas";

const TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Singapore", "Asia/Dubai"];

type Draft = Pick<Preferences, "base_currency" | "timezone" | "number_locale" | "theme" | "default_paper_capital">;

function toDraft(p: Preferences): Draft {
  return {
    base_currency: p.base_currency,
    timezone: p.timezone,
    number_locale: p.number_locale,
    theme: p.theme,
    default_paper_capital: p.default_paper_capital,
  };
}

/** Client-side check mirrors the server rule; the server remains the authority. */
export function validateCapital(value: string, min: string, max: string): string | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return "Enter an amount with at most two decimal places.";
  if (!isDecimalString(min) || !isDecimalString(max)) return null;
  const v = Number(value);
  if (v < Number(min) || v > Number(max)) return `Must be between ${min} and ${max}.`;
  return null;
}

export function PreferencesForm() {
  const prefs = usePreferences();
  if (prefs.isPending) {
    return (
      <Panel>
        <PanelHeader title="Preferences" />
        <PanelBody className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </PanelBody>
      </Panel>
    );
  }
  if (prefs.isError) return <QueryError error={prefs.error} what="preferences" />;
  return <PreferencesEditor initial={prefs.data} />;
}

function PreferencesEditor({ initial }: { initial: Preferences }) {
  const update = useUpdatePreferences();
  const [baseline, setBaseline] = useState<Preferences>(initial);
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saved, setSaved] = useState(false);

  const bounds = baseline.paper_capital_bounds;
  const capitalError = validateCapital(draft.default_paper_capital, bounds.min, bounds.max);
  const serverErrors = update.error instanceof ApiError ? update.error.fieldErrors() : {};
  const timezones = TIMEZONES.includes(draft.timezone) ? TIMEZONES : [draft.timezone, ...TIMEZONES];

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (capitalError) return;
    const current = toDraft(baseline);
    const patch: PreferencesUpdate = {};
    for (const key of Object.keys(draft) as (keyof Draft)[]) {
      if (draft[key] !== current[key]) (patch as Record<string, string>)[key] = draft[key];
    }
    update.mutate(patch, {
      onSuccess: (next) => {
        setBaseline(next);
        setDraft(toDraft(next));
        setSaved(true);
      },
    });
  }

  return (
    <Panel>
      <PanelHeader title="Preferences" description="Display settings and the starting capital for new paper portfolios." />
      <PanelBody>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Base currency" htmlFor="base_currency" error={serverErrors.base_currency}>
            <Select
              id="base_currency"
              value={draft.base_currency}
              onChange={(e) => set("base_currency", e.target.value as Draft["base_currency"])}
            >
              <option value="INR">INR — Indian rupee</option>
              <option value="USD">USD — US dollar</option>
            </Select>
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={serverErrors.timezone}>
            <Select id="timezone" value={draft.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Number format" htmlFor="number_locale" hint="Indian grouping shows 1,00,000; international shows 100,000.">
            <Select
              id="number_locale"
              value={draft.number_locale}
              onChange={(e) => set("number_locale", e.target.value as Draft["number_locale"])}
            >
              <option value="en-IN">Indian (lakh / crore)</option>
              <option value="en-US">International</option>
            </Select>
          </Field>
          <Field label="Theme" htmlFor="theme">
            <Select id="theme" value={draft.theme} onChange={(e) => set("theme", e.target.value as Draft["theme"])}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">Follow system</option>
            </Select>
          </Field>
          <Field
            label={`Default paper capital (${draft.base_currency})`}
            htmlFor="default_paper_capital"
            error={capitalError ?? serverErrors.default_paper_capital}
            hint={`Allowed range ${formatMoney(bounds.min, draft.base_currency, draft.number_locale, 0)} – ${formatMoney(bounds.max, draft.base_currency, draft.number_locale, 0)}. Simulated money only.`}
            className="sm:col-span-2 sm:max-w-sm"
          >
            <Input
              id="default_paper_capital"
              inputMode="decimal"
              className="figures"
              value={draft.default_paper_capital}
              aria-invalid={capitalError ? true : undefined}
              onChange={(e) => set("default_paper_capital", e.target.value.trim())}
            />
          </Field>

          {update.isError && Object.keys(serverErrors).length === 0 ? (
            <div className="sm:col-span-2">
              <QueryError error={update.error} what="saved preferences" />
            </div>
          ) : null}

          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" variant="primary" disabled={update.isPending || Boolean(capitalError)}>
              {update.isPending ? "Saving…" : "Save preferences"}
            </Button>
            {saved ? (
              <span className="flex items-center gap-1 text-xs text-positive" role="status">
                <Check className="size-3.5" aria-hidden /> Saved
              </span>
            ) : null}
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}
