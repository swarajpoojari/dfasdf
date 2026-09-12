# Future backend and admin panel

The mobile app is offline-first and works with no backend at all: templates and
the official asset manifest are bundled, posters are stored on the device. This
document describes the backend it is *shaped for*, so that adding one is a
matter of filling in seams that already exist.

## Why a backend is wanted

- Twenty local offices should not need an app release to update an address.
- A new official template should reach every phone the day it is approved.
- A replaced logo should propagate, with the old version still rendering the
  posters it was approved against.
- Who approved what, and when, should be recorded.

## The publishing workflow

```
UPLOAD ──▶ VERIFY ──▶ APPROVE ──▶ PUBLISH ──▶ AVAILABLE IN APP
   │          │          │           │              │
 admin     hash +     authorised   version       signed sync
 uploads   dimensions  approver    bumped,       bundle, cached
 the file  recorded    signs off   immutable     on device
```

An asset is immutable once published. An update is a new version, never an
overwrite — which is what lets an old poster keep rendering correctly.

## Data model

The app's TypeScript types are the contract; the backend stores the same shapes.

| Collection | Shape | Notes |
| --- | --- | --- |
| `offices` | `LocalOffice` | Address, contact, committee, default footer, accent |
| `eventTypes` | `EventTypeDefinition` | Sections and required slots |
| `assets` | `OfficialAsset` + storage key | Immutable per version |
| `assetSlots` | `AssetSlot` | Declared requirements |
| `templates` | `PosterTemplate` | Immutable per version |
| `fonts` | family → files | With licence metadata |
| `auditLog` | actor, action, target, version, timestamp | Append-only |

Posters stay on the device by default. A future "office library" would add a
`posters` collection holding `PosterDocument` — which is already the structured,
re-renderable form rather than an image.

## Sync

```
GET /v1/manifest?since=<version>
  → { offices, eventTypes, templates, assets, fonts, manifestVersion, signature }

GET /v1/assets/<id>/<version>/binary
  → the file, with a strong ETag and a long cache lifetime
```

Client behaviour:

1. Verify the manifest signature. An unverified manifest is discarded, and the
   app keeps running on what it already has.
2. Feed assets into `AssetRegistry.register(asset, 'backend-sync')`. Version
   downgrades are already refused by the registry.
3. Download binaries lazily, but pre-fetch everything an office's templates need
   so that office can work offline.
4. Verify each binary's checksum against the manifest before it is usable.

## Roles

| Role | Can |
| --- | --- |
| Member | Create posters from published templates and approved assets |
| Office admin | The above, plus edit their office's details and committee |
| Asset approver | Approve and publish assets |
| Template author | Author templates; publishing still needs an approver |
| Association admin | Everything, including creating offices and roles |

Approval must be a different person from the uploader for identity categories.

## Integrity

The mobile app's `manifestFingerprint` is a lightweight consistency check, not a
security control. On the server:

- **SHA-256 over the bytes**, recorded at upload and verified on download.
- **Signed manifests** (Ed25519), with the public key pinned in the app.
- **Immutable storage**, versioned, with no overwrite permission.
- **Append-only audit log** for every upload, approval and publish.

The rule the backend must preserve: no automated process, and specifically no AI
service, may write to the asset registry. In the app this is expressed as
`RegistryMutationSource` having no `'ai'` member; on the server it should be
expressed as service accounts not holding the publish permission.

## Admin panel

A web app over the same API:

- **Offices** — details, committee, default footer, approved assets.
- **Assets** — upload, preview, dimensions and hash, approve, publish, version
  history, and which templates depend on each asset.
- **Templates** — a visual editor writing the same `PosterTemplate` JSON the app
  consumes, with a live preview using the same layout engine (it is pure
  TypeScript and can be shared as a package).
- **Event types** — sections and required slots.
- **Fonts** — upload, licence record, script coverage.
- **Audit** — the log, filterable by actor and asset.

Sharing `domain/` between the app and the panel is the point: a template
previewed in the browser lays out identically on the phone because it is the
same code.

## Migration path

1. **Phase A** — read-only sync of offices, event types and templates. The app
   already reads these through registries, so this is a loader change.
2. **Phase B** — asset sync with signature and hash verification.
3. **Phase C** — admin panel for uploads and approvals.
4. **Phase D** — template authoring in the browser.
5. **Phase E** — optional cloud poster library and sharing between offices.

Nothing in phases A–E requires the app's architecture to change.
