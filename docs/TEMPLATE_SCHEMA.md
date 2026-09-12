# Template schema

A template is data. It says what a poster looks like; it never says what it
says. Adding one means writing a configuration object, not a screen.

## PosterTemplate

```ts
type PosterTemplate = {
  id: string;
  name: string;
  description: string;
  localOfficeId: string | null;      // null = available to every office
  eventTypes: readonly string[];     // empty = any event type
  languages: readonly ('en' | 'hi' | 'mr' | 'kn')[];
  version: number;                   // bumped on every published change
  schemaVersion: number;             // TEMPLATE_SCHEMA_VERSION
  official: boolean;
  canvas: { width: number; height: number };   // always 1080 × 1536
  background: TemplateBackground;
  elements: readonly PosterElement[];
  requiredSlotIds: readonly string[];
  updatedAt: string;
};
```

`version` matters: a poster records the version it was made with, and
`migrateToTemplate` re-applies a newer one while keeping every word the user
typed.

## Elements

Every element carries:

| Field | Meaning |
| --- | --- |
| `id` | Stable across template versions — this is how a user's changes survive an upgrade |
| `type` | One of the ten element types |
| `name` | Shown in the editor's layer list and in error messages |
| `frame` | `{ x, y, width, height }` in design units |
| `rotation`, `zIndex`, `locked`, `visible`, `opacity` | |
| `flow` | How the element behaves when content changes |

### `flow`

```ts
{
  group?: string;     // elements in a group stack vertically
  gapBelow: number;   // minimum gap kept below it when the group re-flows
  canGrow: boolean;   // may its height increase to fit its content?
  canShrink: boolean; // may it shrink when content is short?
  pinned: boolean;    // keeps its authored y; the flow never moves it
}
```

A group may not extend past whatever the template authored below it. That is
what keeps the footer where it belongs however long the felicitation list gets.

### `TEXT`

```ts
{
  type: 'TEXT';
  style: TextStyle;           // family id, size, weight, colour, align, line height, tracking
  autoFit: AutoFitPolicy;     // { enabled, minFontSize, maxFontSize, minLineHeightScale, maxHeight? }
  text: string;               // literal text; ignored when `binding` is set
  binding?: ContentBindingPath;
  placeholder?: string;       // editor only, never exported
  maxLines?: number;
  required?: boolean;
}
```

`fontFamily` is an id from the font registry (`src/theme/fonts.ts`) — never a
raw system font name. `autoFit` states the limits inside which the engine may
shrink text; outside them it reports an overflow instead.

### Asset-backed: `IMAGE`, `OFFICIAL_LOGO`, `DECORATION`

```ts
{
  assetId?: string;      // the chosen approved asset
  slotId?: string;       // the slot this frame is reserved for
  cropMode: 'none' | 'centerSquare' | 'centerCircle' | 'approvedFrame';
  fit: 'contain' | 'cover';
  required?: boolean;
}
```

For a protected asset, `cover` with `cropMode: 'none'` silently degrades to
`contain`: a poster will show letterboxing before it will crop or distort an
official image.

### List sections: `PROGRAMME_LIST`, `GUEST_LIST`, `FELICITATION_LIST`

Bound to `eventDetails.programme`, `.guests` and `.felicitations`. Shared fields:
`heading`, `headingStyle`, `primaryStyle`, `secondaryStyle`, `rowGap`,
`headingGap`, `autoFit`. Plus:

- `PROGRAMME_LIST` — `timeColumnWidth`
- `GUEST_LIST` — `roleStyle`, `roles` (empty = every role present)
- `FELICITATION_LIST` — `bulletStyle`, `bulletGlyph`, `columns` (two columns are
  used only while every entry is a name and designation; anything with a
  description or bullets falls back to one full-width column)

### Others

`SHAPE` (rect / roundedRect / ellipse), `LINE` (with `ornament: 'none' |
'diamond' | 'dots'` for the association's divider rules), `QR_CODE`.

## Content bindings

An element with a `binding` displays a field of the poster's structured content
rather than text stored in the layout:

`title`, `subtitle`, `dateLabel`, `time`, `venue`, `invitationNote`,
`footerNote`, `officeName`, `officeAddress`, `associationName`,
`associationNameLocal`, `programme`, `guests`, `felicitations`.

Resolved in `src/domain/poster/binding.ts`.

## Authoring a new template

All five official templates come from `buildCommunityPosterTemplate`. Adding one
is an entry in `src/domain/templates/officialTemplates.ts`:

```ts
buildCommunityPosterTemplate({
  id: 'tpl.blood-donation.camp',
  name: 'Blood Donation — Camp',
  description: 'Camp notice with the schedule and organising committee.',
  eventTypes: ['blood-donation', 'social-service'],
  version: 1,
  updatedAt: '2026-02-01',
  programme: { enabled: true, heading: 'SCHEDULE', weight: 1.4 },
  guests: { enabled: true, heading: 'ORGANISED BY', weight: 1 },
  titleFontSize: 58,
  accent: POSTER_COLORS.maroon,
}),
```

`weight` splits the body region between the enabled sections. The builder lays
out the header, title, optional hero image, date/venue and footer around them.

`src/domain/__tests__/templates.test.ts` then checks the new template
automatically: canvas size, schema version, unique element ids, every frame
inside the canvas, locked logo frames, and that the association logo is both
required and present.

### Authoring one by hand

Return a `PosterTemplate` directly if the builder's structure does not fit. The
rules the tests enforce:

- canvas is `DESIGN_CANVAS` (1080 × 1536);
- `schemaVersion` is `TEMPLATE_SCHEMA_VERSION`;
- element ids are unique within the template;
- every frame sits inside the canvas and respects the 48-unit safe margin at the
  bottom;
- there is an `OFFICIAL_LOGO` element with `slotId: 'slot.association.logo'`, and
  it is `locked`;
- `requiredSlotIds` includes every slot the poster cannot do without.

## Changing an existing template

Bump `version`. Keep element `id`s stable wherever the element still means the
same thing — that is what carries a user's chosen assets and visibility settings
across the upgrade. Posters made against the old version keep working and show a
"template has been updated" warning in the poster check.

Bump `TEMPLATE_SCHEMA_VERSION` only when the element *shape* changes; documents
then need a migration, and validation blocks export until they get one.
