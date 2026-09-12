# Architecture

## 1. What the reference posters are made of

The association's existing posters share a consistent vertical hierarchy. Every
official template in this app is built from it:

```
┌──────────────────────────────────────────────┐
│ ▣ assoc. logo   BILLAWAR ASSOCIATION MUMBAI  ▣ office │   identity band
│                 बिल्लवर असोसिएशन मुंबई               │
│                Navi Mumbai Local Office               │
│                   <office address>                    │
│ ──────────────────◆────────────────────────── │   decorative rule
│                                                       │
│         172nd Guru Jayanthi of                        │   event title
│    Brahma Shree Narayana Guru Swami                   │   (the largest type)
│         <subtitle / organiser>                        │
│                                                       │
│                  [ approved                 ]         │   hero image
│                  [ Guru image               ]         │   (never generated)
│                                                       │
│        Sunday, 13 September 2026 · 5.00 pm            │   when
│        Billawar Bhavan, Vashi, Navi Mumbai            │   where
│                                                       │
│                 DHARMIKA SABHA                        │   named section
│   Presided By    Shri Harish G. Amin                  │   role → name → detail
│   Chief Guest    Dharmadarshi Ramesh M. Poojary       │
│                                                       │
│                  FELICITATION                         │   named section
│   Shri Rajesh Poojary — Asst. Commissioner, GST       │   name | description
│     • citation line                                   │   variable length
│                                                       │
│ ──────────────────◆────────────────────────── │
│        Billawar Association Mumbai — Navi Mumbai      │   footer
└──────────────────────────────────────────────┘
```

Five observations drove the design:

1. **Identity sits at the top and in the middle.** The logo and the Guru image
   are the two things a reader checks first, and the two things an AI model gets
   wrong. They became the protected asset system.
2. **The middle of the poster is data, not design.** Guests and felicitations are
   rows, with a role or a name and a description underneath. They became the
   `GUEST_LIST` and `FELICITATION_LIST` elements bound to structured content.
3. **Section length varies enormously between posters.** One felicitation has a
   four-line citation, the next has none. That became the re-flow engine.
4. **The frame is fixed.** Borders, rules and the footer are the same every
   time. Those are pinned elements the flow never moves.
5. **The look is formal, not contemporary.** Cream paper, maroon and gold,
   serif display type, a diamond-ornamented rule. That became
   `domain/templates/tokens.ts`, kept deliberately separate from the app's own
   modern UI palette in `theme/theme.ts`.

## 2. Layers

```
┌─────────────────────────────────────────────────────────────┐
│ features/ + components/ + navigation/    React Native UI     │
├─────────────────────────────────────────────────────────────┤
│ state/ (zustand)   storage/   ai/                           │
├─────────────────────────────────────────────────────────────┤
│ renderer/   Skia painter · resources · Skia text measurer    │
├─────────────────────────────────────────────────────────────┤
│ domain/     pure TypeScript — no React, no native modules    │
│  types · assets · offices · eventTypes · templates ·         │
│  layout · poster · validation · export                       │
└─────────────────────────────────────────────────────────────┘
```

Dependencies only ever point downwards. `domain/` imports nothing from
`features/`, `renderer/` or `state/`, which is what makes it directly testable
in plain Node.

## 3. The official asset system

Two distinct concepts:

- **`AssetSlot`** (`domain/assets/slots.ts`) — a *declared requirement*: "this
  template needs the association logo here".
- **`OfficialAsset`** (`domain/types/assets.ts`) — the *approved binary* that
  fills it, with `checksum`, `version`, `approved` and `protected`.

Keeping them apart is what lets the app ship without inventing a logo. An
unfilled slot renders a hatched "APPROVED ASSET REQUIRED" box and blocks export.

**Protection.** `IDENTITY_CATEGORIES` (association logo, office logo, Guru,
Koti-Chennaya, temple, official photo) are forced to `protected: true` at
registration time — a manifest cannot opt out. Protected assets get
`PROTECTED_ASSET_POLICY`, which permits position, uniform scale, approved crops
and masks, opacity above 85%, and replacement from the approved library; and
denies non-uniform scale, rotation, recolour, flips, stylisation, AI
regeneration, AI enhancement, background removal, automatic replacement and
replacement by a generated image.

**Registry integrity.** `AssetRegistry.register` accepts a
`RegistryMutationSource` of `'bundled-manifest' | 'backend-sync' | 'admin-publish'`.
There is no `'ai'` source, and version downgrades are refused.

## 4. Template engine

A `PosterTemplate` is data: canvas, background, and a list of `PosterElement`s.
Elements carry `id`, `type`, `frame`, `rotation`, `zIndex`, `locked`, `visible`,
`opacity`, plus a `flow` describing how they behave when content changes, and —
for text and list elements — a `binding` naming the content field they display.

Element types: `TEXT`, `IMAGE`, `OFFICIAL_LOGO`, `SHAPE`, `LINE`, `DECORATION`,
`QR_CODE`, `PROGRAMME_LIST`, `GUEST_LIST`, `FELICITATION_LIST`.

All five official templates come from one builder,
`buildCommunityPosterTemplate`, which takes a section configuration and produces
the vertical structure above. Adding a sixth template is a config object, not a
screen. Details in [`TEMPLATE_SCHEMA.md`](TEMPLATE_SCHEMA.md).

## 5. The layout engine

`layoutPoster(input) → PosterLayout` is a pure function. Its output is a flat
list of fully-resolved `RenderNode`s in absolute design coordinates, plus
per-element geometry and a list of issues.

```
document + template + office + measurer
        │
        ├── resolve bindings        ("title" → the user's text)
        ├── measure content         (wrap → auto-fit → section blocks)
        ├── re-flow groups          (grow, push down, compress, clamp)
        ├── emit render nodes       (text lines, rects, images, placeholders)
        └── geometry checks         (outside canvas, safe margin, overlap)
```

**Measurement is an interface.** `TextMeasurer` has two implementations: a
deterministic pure-TypeScript metric measurer (used by tests and as a fallback),
and a Skia-backed one using real font metrics (used by the editor and export).
Layout stays pure either way.

**Auto-fit makes concessions in a designer's order**: keep the authored size if
it fits; tighten line height to the policy minimum; then reduce font size in 6%
steps to the floor. If it still does not fit, it says so.

**Re-flow.** Elements sharing a `flow.group` are stacked in authored order.
A growing element pushes the rest of its group down. A group may not extend past
whatever the template authored below it. When it would, the engine retries at
progressively tighter gap and font scales (down to 70%) and, failing that,
reports a `TEXT_OVERFLOW` with the shortfall in design units. Frames are clamped
so nothing is ever *positioned* off the poster, while the unclamped "required"
bottom is what the fit test uses — clamping can never hide an overflow.

**Scripts.** Text is classified into Latin / Devanagari / Kannada runs, and the
font registry resolves a covering face per run. Devanagari and Kannada carry
larger `contentHeight` metrics because matras need vertical room.

## 6. Rendering and export

One function, `paintPoster(canvas, layout, resources, options)`, draws a poster.
The editor records it into a Skia picture scaled to the device; export draws it
into an offscreen surface at 1×, 1.5× or 2× the design canvas. The node list is
identical and the only difference is one `canvas.scale`, so the preview and the
exported file cannot diverge.

Export produces PNG or JPEG via `encodeToBase64`, or a PDF by placing the PNG on
a correctly-proportioned page with `expo-print`. Progress is reported as
“Preparing high-resolution poster…” → “Poster exported successfully.”

## 7. Validation strategy

Thirteen rules in `domain/validation/rules.ts`, each returning findings:

| Severity | Rules |
| --- | --- |
| **error** (blocks export) | official logo, required official images, event title, date, venue, text fits, everything inside the canvas |
| **warning** | guest information, programme information, overlap, image resolution, template version, office configuration |

The report carries both a tick-list (what the user sees) and the findings behind
it. Three bounded automatic fixes are offered: `relax-section` (tighten the type
and gaps within the template's stated limits), `nudge-into-canvas`, and
`hide-empty-element`. Each is an ordinary edit and can be undone. When a section
is already as tight as permitted, the app says so and points at the text
assistant rather than cutting anything off.

## 8. AI

`ContentAssistant` is the single entry point. Requests pass `checkAiRequest` on
the way in and `sanitiseAiText` on the way out. `AiCapability` lists ten text and
structuring tasks and has no image member, so "generate a logo" is not a request
the system can express. The free-text guard additionally refuses anything naming
Narayana Guru, Koti-Chennaya, a logo/emblem/seal, religious imagery or a
portrait, and anything pairing an image verb with an image noun.

`OfflineTextProvider` handles tidy-up, sentence-boundary shortening, title
suggestions and parsing "5.00 pm — Deepa Prajwalana" notes into programme rows,
entirely on device. A network provider can be registered for richer help; both go
through the same guardrails.

## 9. MVP screens

| Screen | Purpose |
| --- | --- |
| Home | Create, continue draft, recent posters, offices, templates, asset library |
| Local office | Choose the office whose identity the poster carries |
| Event type | 14 configurable types, searchable |
| Template | Templates matching the office and event type, with previews |
| Event details | Structured content: title, date, venue, programme, guests, felicitations |
| Poster editor | Zoom, pan, select, move, replace approved image, undo/redo, layers, preview |
| Poster check | The validation tick-list with automatic fixes |
| Preview | Full render of exactly what will be exported |
| Export | Format, size, export, share, duplicate |
| Official asset library | Every slot with OFFICIAL / APPROVED / VERSION or "Approved asset required." |
| Template library | Browse and filter all templates |

## 10. Performance

Aimed at mid-range Android:

- Layout and validation run on **commit**, not on every keystroke; screens
  debounce before committing, which also makes undo step back a whole edit.
- The poster is recorded once into a Skia picture; pan and zoom are transforms on
  that picture, not re-layouts.
- Decoded images are cached by `id@version` and typefaces by file name, so
  switching templates or re-exporting never decodes the same logo twice.
- Template and poster lists use schematic previews derived from element frames
  rather than painting real posters into a scrolling gallery.
- `PosterCanvas` is memoised; list rows are memoised components.

## 11. Extension points

- **A new local office** — one entry in `domain/offices/offices.ts` plus its
  approved assets. No screen knows an office name.
- **A new event type** — one entry in `domain/eventTypes/eventTypes.ts`.
- **A new template** — one config object in
  `domain/templates/officialTemplates.ts`.
- **A new element type** — add it to the `PosterElement` union, measure it in
  `layout/engine.ts`, paint it in `renderer/paint.ts`.
- **A backend** — see [`BACKEND.md`](BACKEND.md). The registry, the template
  registry and the storage layer are already the seams it plugs into.
