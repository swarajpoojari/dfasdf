# Installing official assets and fonts

This repository ships **no** association artwork and **no** font binaries. Both
have to be installed once, by someone with the approved files.

---

## Why the folders are empty

An AI model asked for "the Billawar Association logo" or "Sri Narayana Guru"
will produce something that looks plausible and is wrong. Shipping a
placeholder image risks it being mistaken for the real thing and printed on a
community poster.

So the app ships the *slots* and none of the *files*. Until a slot is filled the
poster shows a hatched box reading **APPROVED ASSET REQUIRED**, and validation
refuses to export. That is the designed behaviour.

---

## 1. Official assets

### Folder layout

```
assets/official/
├── manifest.ts               ← the only place assets enter the bundle
├── association/              billawar-association-logo-v1.png
├── guru/                     narayana-guru-approved-v1.png
├── koti-chennaya/            koti-chennaya-approved-v1.png
├── temples/
├── decorations/
└── offices/
    ├── navi-mumbai/          navi-mumbai-branding-v1.png
    ├── dahisar/
    ├── dombivli/
    ├── chembur/
    ├── vikhroli/
    └── kalyan/
```

### Steps

**1. Get the approved file.** From the association, in its original resolution.
Do not re-save, re-crop, sharpen, "clean up" or re-colour it. Transparent PNG is
preferred for logos.

**2. Check the size.** Each slot in `src/domain/assets/slots.ts` states a
`recommendedMinWidth`. Below it the poster check warns that the image will look
soft when exported at 2160px.

**3. Drop it in** the folder for its category, with a versioned name:
`billawar-association-logo-v1.png`.

**4. Register it** in `assets/official/manifest.ts`:

```ts
import { manifestFingerprint } from '@/domain/assets/integrity';

export const BUNDLED_OFFICIAL_ASSETS: readonly BundledAssetEntry[] = [
  {
    id: 'asset.association.logo',
    name: 'Billawar Association Mumbai — Official Logo',
    category: 'ASSOCIATION_LOGO',
    source: { kind: 'bundled', module: require('./association/billawar-association-logo-v1.png') },
    type: 'image/png',
    width: 1024,          // the file's true pixel size — this is what protects
    height: 1024,         // the aspect ratio, so it must be exact
    checksum: manifestFingerprint({ id: 'asset.association.logo', version: 1, width: 1024, height: 1024 }),
    version: 1,
    approved: true,
    protected: true,
    approvedBy: 'Head Office',
    approvedAt: '2026-01-01',
    fillsSlot: 'slot.association.logo',
  },
];
```

`width` and `height` must be the file's true dimensions. They are what
`fitContain` and `resizeElement` use to keep the asset from ever being
stretched, so a wrong value there is the one way to get a distorted logo.

**5. Verify.**

```bash
npm run verify
npm start
```

Open **Official Asset Library** — the asset should show OFFICIAL / APPROVED /
VERSION 1.0 instead of "Approved asset required."

### Office-specific assets

Use the slot id `slot.office.<office-id>.logo` (for example
`slot.office.navi-mumbai.logo`) and set `officeIds: ['navi-mumbai']` so the asset
is only offered to that office.

### Updating an asset

Never overwrite a file in place — a poster made last month should keep rendering
with the version it was approved against.

1. Add the new file as `...-v2.png`.
2. Add a new manifest entry with `version: 2` and a recomputed `checksum`.
3. Keep or remove the v1 entry as the association decides.

The registry refuses a lower version than the one already installed, so a stale
sync can never downgrade a published asset.

### What is never allowed

Not by policy, not by configuration, and not by any code path in this app:

- generating, redrawing or "improving" an official asset with AI;
- stretching or squashing it (non-uniform scale);
- recolouring, mirroring, rotating or applying filters;
- automatic background removal or face enhancement;
- automatic replacement, or substituting a generated image.

Enforced in `src/domain/assets/policy.ts` and tested in
`src/domain/__tests__/assetPolicy.test.ts`.

---

## 2. Fonts

Posters must not be rendered with "whatever the phone has" — the same poster
would then export differently on two Android devices.

### Files needed

All are SIL Open Font Licence, from <https://fonts.google.com/noto>:

| Family | Files | Covers |
| --- | --- | --- |
| Noto Serif | Regular, Medium, SemiBold, Bold | display type, English |
| Noto Sans | Regular, Medium, SemiBold, Bold | body type, English |
| Noto Sans Devanagari | Regular, Bold | Hindi, Marathi |
| Noto Sans Kannada | Regular, Bold | Kannada |

### Steps

1. Put the `.ttf` files in `assets/fonts/`, using exactly the names listed in
   `src/theme/fonts.ts` (for example `NotoSansDevanagari-Regular.ttf`).
2. Register them in `assets/fonts/index.ts`:

```ts
export const FONT_MODULES: Readonly<Record<string, number>> = {
  'NotoSerif-Regular.ttf': require('./NotoSerif-Regular.ttf'),
  'NotoSerif-Bold.ttf': require('./NotoSerif-Bold.ttf'),
  'NotoSans-Regular.ttf': require('./NotoSans-Regular.ttf'),
  'NotoSansDevanagari-Regular.ttf': require('./NotoSansDevanagari-Regular.ttf'),
  'NotoSansKannada-Regular.ttf': require('./NotoSansKannada-Regular.ttf'),
  // …
};
```

3. Include the licence file alongside them.

Until they are installed the editor shows a **Fonts not installed** badge and
falls back to the platform face. Layout still uses the deterministic metric
measurer, so it stays consistent — but the rendered result will not match the
intended typography.

### Adding another script

1. Add the range to `RANGES` in `src/domain/layout/script.ts`.
2. Add a family to `FONT_FAMILIES` in `src/theme/fonts.ts` with `scripts`
   including the new id and realistic `metrics`.
3. Add a case to `indicRunWidth` in `src/domain/layout/textMeasure.ts` if the
   script has combining marks.
4. Add the language to the templates' `languages` array.
