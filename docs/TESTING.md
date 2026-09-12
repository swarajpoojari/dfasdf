# Testing strategy

```bash
npm test          # 98 tests
npm run verify    # typecheck + lint + tests
```

## What is tested, and why it can be

The `domain/` layer is pure TypeScript with no React and no native modules, so
it runs directly in Node under `ts-jest`. That is not an accident of layering —
it is the reason the layout engine, the asset policy and the validation rules
can be asserted with real numbers rather than snapshots.

| Suite | Covers |
| --- | --- |
| `domain/__tests__/assetPolicy.test.ts` | Every protected operation is denied; identity categories are forced to protected; unapproved assets are refused; version downgrades are refused; readable errors |
| `domain/__tests__/layout.test.ts` | Script detection, word wrap (including hard breaks and explicit newlines), truncation reporting, auto-fit concessions and floors |
| `domain/__tests__/engine.test.ts` | Re-flow, section growth, footer stability, overflow reporting, compression limits, placeholders in edit vs export mode, layout determinism |
| `domain/__tests__/operations.test.ts` | Aspect ratio preservation, locked elements, bound text, duplication, template migration, undo/redo |
| `domain/__tests__/validation.test.ts` | Each blocking rule, warnings that do not block, and the three automatic fixes including their floor |
| `domain/__tests__/templates.test.ts` | All official templates: canvas, schema, unique ids, in-canvas frames, locked logos, coverage of every office and event type |
| `ai/__tests__/guardrails.test.ts` | Refusals for identity and image requests, allowances for text tasks, sanitisation, offline structuring |

### Tests worth reading first

`assetPolicy.test.ts` and `guardrails.test.ts` are the executable form of the
product's central rule. `engine.test.ts` covers the felicitation-growth
behaviour that is the hardest part of the layout to get right.

`'produces the same layout twice for the same document'` is the determinism
guard: it is what makes "the preview is what you export" testable.

## What is not tested here, honestly

- **Nothing has been run on a device or simulator.** There is no Android or iOS
  toolchain in the environment this was built in, so the screens, gestures and
  Skia rendering are unexercised at runtime. They typecheck and lint; that is
  all that has been established.
- **No component or screen tests.** Adding them means `jest-expo` and a second
  Jest project (see below) — worth doing, not done.
- **No real Skia text measurement in tests.** Tests use the deterministic metric
  measurer. On device the Skia measurer produces slightly different widths, so
  line breaks can differ from the test baseline by a word. That is why alignment
  is recomputed at paint time from the real face rather than trusting the
  layout-time estimate.
- **No visual regression baseline yet.** See below.

## Adding component tests

```bash
npm i -D jest-expo @testing-library/react-native
```

Then split Jest into two projects — `domain` (node + ts-jest, the current
config) and `app` (preset `jest-expo`, matching `**/__tests__/**/*.test.tsx`).
Keeping them apart matters: pulling the React Native transform into the domain
tests would make them several times slower for no benefit.

## Adding visual regression

The pieces are already in place, because layout is pure and the painter is a
single function:

1. Build a fixture set — sample content × each official template.
2. Render each with `paintPoster` into an offscreen surface (a Node harness with
   CanvasKit, or a device-side script) and encode to PNG.
3. Compare against committed baselines with a pixel-diff tool.
4. Fail the build on any diff; regenerate baselines deliberately when a template
   version is bumped.

Until that exists, `engine.test.ts` asserts the *structure* — node counts,
positions, issue codes — which catches re-flow regressions without needing
images.

## Manual test checklist

Before a release, on a mid-range Android device:

**Setup** — with assets missing, the poster shows "APPROVED ASSET REQUIRED" and
export is blocked. With assets installed, they render at full quality.

**Content** — a felicitation entry with four bullet points re-flows the section
and pushes nothing off the poster; an absurdly long one produces an overflow
warning with a working "Fix Automatically"; Devanagari and Kannada names render
with the correct faces and no clipped matras.

**Protection** — dragging a resize handle on the logo keeps its proportions;
"Replace" only ever offers approved assets; asking the AI assistant to draw a
logo produces the "Approved asset required" message.

**Export** — the exported file matches the preview; a 2160px export is sharp;
sharing to WhatsApp works; the PDF prints at the right proportions.

**Offline** — in aeroplane mode, a poster can be created, edited and exported
end to end.
