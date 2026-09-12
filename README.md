# Billawar Association Mumbai — Poster Studio

A React Native (Expo) application for creating the association's official posters:
Guru Jayanti, Dharmika Sabha, felicitations, cultural programmes and community
notices, for the head office and every local office.

It is an internal design tool, not a poster generator. A poster is built from
structured data, an official template and approved assets — never from a prompt,
and never flattened into a picture.

```
Poster = Template JSON + Approved Assets + Structured Content + Rendering Engine
```

---

## The rule this whole codebase is built around

> **GENERATIVE AI CAN ASSIST THE CONTENT.**
> **OFFICIAL ASSETS MUST COME FROM THE APPROVED ASSET LIBRARY.**

The Billawar Association logo, Sri Narayana Guru, Koti-Chennaya, temple images
and approved photographs are the community's identity. They are stored as
immutable, versioned, approved files and placed on a poster exactly as supplied.

They are never generated, redrawn, reinterpreted, beautified, stylised,
face-enhanced, recoloured, stretched, mirrored, background-removed, AI-enhanced
or automatically replaced. When one is missing, the app says
**“Approved asset required.”** and refuses to export — it does not invent an
approximation.

Where this is enforced in code:

| Guarantee | Enforced in |
| --- | --- |
| Identity categories are always protected | [`src/domain/assets/registry.ts`](src/domain/assets/registry.ts) (`normaliseAsset`) |
| Which operations are permitted at all | [`src/domain/assets/policy.ts`](src/domain/assets/policy.ts) |
| Every mutation goes through the policy | [`src/domain/poster/operations.ts`](src/domain/poster/operations.ts) |
| Aspect ratio can never be broken | `resizeElement`, and `fitContain` in [`src/domain/layout/engine.ts`](src/domain/layout/engine.ts) |
| No AI service can write to the registry | `RegistryMutationSource` — there is no `'ai'` member |
| AI cannot be asked for imagery | [`src/ai/guardrails.ts`](src/ai/guardrails.ts) — `AiCapability` has no image member |
| A missing asset blocks export | [`src/domain/validation/rules.ts`](src/domain/validation/rules.ts) |

These are covered by tests in `src/domain/__tests__/assetPolicy.test.ts` and
`src/ai/__tests__/guardrails.test.ts`.

---

## Getting started

```bash
npm install
npm start          # Expo dev server
npm run android    # or: npm run ios
npm run verify     # typecheck + lint + tests
```

Requirements: Node 20+, and Expo Go or a development build. `@shopify/react-native-skia`
and `react-native-reanimated` need a native build, so Expo Go works for development
but a development build is recommended.

### Before the app is genuinely usable

This repository deliberately ships **no** association artwork and **no** font
binaries. Two setup steps are needed:

1. **Official assets** — drop the approved files into `assets/official/` and
   register them in `assets/official/manifest.ts`.
   See [`docs/ASSET_REPLACEMENT.md`](docs/ASSET_REPLACEMENT.md).
2. **Fonts** — add the Noto faces to `assets/fonts/` and register them in
   `assets/fonts/index.ts`. Same document, § Fonts.

Until then the app runs, the editor works, and the poster shows clearly-marked
placeholders instead of the logo and the Guru image — with export blocked.
That is the intended behaviour, not a bug.

---

## The workflow

```
HOME → LOCAL OFFICE → EVENT TYPE → TEMPLATE → EVENT DETAILS
     → POSTER EDITOR → POSTER CHECK → PREVIEW → EXPORT / SHARE
```

Each step is a screen under `src/features/`, wired up in
[`src/navigation/RootNavigator.tsx`](src/navigation/RootNavigator.tsx).

---

## How it is put together

```
src/
├── domain/            Pure TypeScript. No React, no native modules.
│   ├── types/         Assets, elements, templates, content, documents, canvas
│   ├── assets/        Official asset registry, policy, slots, integrity
│   ├── offices/       Local office configuration
│   ├── eventTypes/    Event type configuration
│   ├── templates/     Design tokens, template builder, official templates
│   ├── layout/        Script detection, measurement, wrap, auto-fit, re-flow
│   ├── poster/        Document model, bindings, operations, undo/redo, samples
│   ├── validation/    Rules, report, automatic fixes
│   └── export/        Export pipeline and file naming
├── renderer/          Skia painter, canvas component, resource loading
├── ai/                Guardrails, provider interface, offline assistant
├── state/             zustand stores
├── storage/           Offline document store
├── components/ui/     Design-system components
├── features/          One folder per screen
├── navigation/        Stack navigator and route types
└── theme/             App design system and the font registry
```

The `domain/` layer has no dependency on React Native, which is why the layout
engine, the asset policy and the validation rules can be unit-tested directly
(98 tests, `npm test`).

Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Key ideas

**Content is separate from presentation.** `PosterDocument.eventDetails` holds
what the poster says; `PosterDocument.elements` holds where it goes. A template
can be upgraded to version 2 without anyone retyping a word
(`migrateToTemplate`), and editing a word never disturbs the association's
layout.

**One coordinate system.** Everything is authored against 1080 × 1536 design
units. The editor scales that down to the phone; export scales it up to 1080,
1620 or 2160 pixels. The exported file is drawn from the design grid by the same
painter that draws the preview — it is never a screenshot.

**Layout is a computation, not a set of coordinates.** Section heights come from
measuring the actual content. When a felicitation citation grows, the section
grows and everything after it re-flows. When the room runs out the engine
tightens gaps, then type size, within limits the template states — and then
reports an overflow. Text is never silently clipped.

**Nothing broken gets exported.** The poster check runs thirteen rules; any
error blocks export, and several offer a bounded “Fix Automatically”.

**It works offline.** Templates, official assets, fonts and saved posters are all
on the device. Only the optional AI text assistant benefits from a connection —
and there is a rule-based offline assistant when there isn't one.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Reference-poster analysis, layer design, rendering and validation strategy, MVP scope, performance |
| [`docs/TEMPLATE_SCHEMA.md`](docs/TEMPLATE_SCHEMA.md) | Template and element schema, how to author a new template |
| [`docs/ASSET_REPLACEMENT.md`](docs/ASSET_REPLACEMENT.md) | Installing official assets and fonts |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing strategy, what is and is not covered |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Future backend and admin panel architecture |

---

## Status

Verified in this repository: `npm run typecheck`, `npm run lint` and `npm test`
(98 tests) all pass. The app has **not** been run on a device or simulator from
here — there is no Android/iOS toolchain in this environment — so the screens,
gestures and Skia rendering are unexercised at runtime. Treat the first device
build as the point where that gets confirmed.
