/**
 * OFFICIAL ASSET MODEL
 *
 * Product rule that governs this entire file:
 *
 *   GENERATIVE AI CAN ASSIST THE CONTENT.
 *   OFFICIAL ASSETS MUST COME FROM THE APPROVED ASSET LIBRARY.
 *
 * The association logo, Sri Narayana Guru, Koti-Chennaya, temple images and
 * approved photographs are *identity*. They are stored as immutable, versioned,
 * approved binaries and are placed on a poster exactly as supplied. They are
 * never redrawn, re-coloured, stylised, enhanced, flipped, distorted or
 * regenerated — by AI or by anything else.
 */

export const ASSET_CATEGORIES = [
  'ASSOCIATION_LOGO',
  'LOCAL_OFFICE_LOGO',
  'GURU_IMAGE',
  'KOTI_CHENNAYA_IMAGE',
  'TEMPLE_IMAGE',
  'OFFICIAL_PHOTO',
  'DECORATION',
  'BACKGROUND',
  'ICON',
  'OTHER',
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/**
 * Categories that carry the association's or the community's identity.
 * Membership here forces `protected: true` at registration time.
 */
export const IDENTITY_CATEGORIES: readonly AssetCategory[] = [
  'ASSOCIATION_LOGO',
  'LOCAL_OFFICE_LOGO',
  'GURU_IMAGE',
  'KOTI_CHENNAYA_IMAGE',
  'TEMPLE_IMAGE',
  'OFFICIAL_PHOTO',
];

export type AssetMimeType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';

/**
 * Where the binary comes from.
 * - `bundled`: shipped inside the app, always available offline.
 * - `synced`:  downloaded from the association backend and cached on device.
 * - `local`:   picked by an admin during an approval flow; never usable on a
 *              poster until it has been approved and published.
 */
export type AssetSourceKind = 'bundled' | 'synced' | 'local';

export interface AssetSource {
  readonly kind: AssetSourceKind;
  /** `require()` handle for bundled assets, resolved at build time. */
  readonly module?: number;
  /** file:// or https:// for synced/local assets. */
  readonly uri?: string;
}

export interface OfficialAsset {
  readonly id: string;
  readonly name: string;
  readonly category: AssetCategory;
  readonly source: AssetSource;
  /** Convenience mirror of `source.uri` for synced/local assets. */
  readonly uri?: string;
  readonly type: AssetMimeType;
  /** Intrinsic pixel size. Aspect ratio is derived from this and is never altered. */
  readonly width: number;
  readonly height: number;
  /** Integrity fingerprint of the published binary (see utils/checksum). */
  readonly checksum: string;
  /** Monotonic per-asset version, published by the admin panel. */
  readonly version: number;
  readonly approved: boolean;
  readonly protected: boolean;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  /** Offices allowed to use this asset. `undefined` means every office. */
  readonly officeIds?: readonly string[];
  readonly description?: string;
  readonly tags?: readonly string[];
}

export const assetAspectRatio = (asset: OfficialAsset): number =>
  asset.height === 0 ? 1 : asset.width / asset.height;

/* -------------------------------------------------------------------------- */
/* Transform policy                                                           */
/* -------------------------------------------------------------------------- */

export const ASSET_OPERATIONS = [
  'position',
  'uniformScale',
  'nonUniformScale',
  'rotate',
  'opacity',
  'crop',
  'mask',
  'recolor',
  'flipHorizontal',
  'flipVertical',
  'stylize',
  'aiRegenerate',
  'aiEnhance',
  'aiBackgroundRemoval',
  'autoReplace',
  'replaceFromApprovedLibrary',
  'replaceWithGeneratedImage',
] as const;

export type AssetOperation = (typeof ASSET_OPERATIONS)[number];

export type AssetPolicy = Readonly<Record<AssetOperation, boolean>>;

export type CropMode = 'none' | 'centerSquare' | 'centerCircle' | 'approvedFrame';

/**
 * PROTECTED policy — applies to every identity asset.
 * Only placement-level operations are permitted; anything that would change
 * what the image *depicts* is denied.
 */
export const PROTECTED_ASSET_POLICY: AssetPolicy = Object.freeze({
  position: true,
  uniformScale: true,
  nonUniformScale: false,
  rotate: false,
  opacity: true,
  crop: true, // restricted further to APPROVED_CROP_MODES
  mask: true, // restricted further to APPROVED_MASKS
  recolor: false,
  flipHorizontal: false,
  flipVertical: false,
  stylize: false,
  aiRegenerate: false,
  aiEnhance: false,
  aiBackgroundRemoval: false,
  autoReplace: false,
  replaceFromApprovedLibrary: true,
  replaceWithGeneratedImage: false,
});

/** Ordinary, non-identity artwork (decorations, backgrounds) is more flexible. */
export const STANDARD_ASSET_POLICY: AssetPolicy = Object.freeze({
  position: true,
  uniformScale: true,
  nonUniformScale: true,
  rotate: true,
  opacity: true,
  crop: true,
  mask: true,
  recolor: true,
  flipHorizontal: true,
  flipVertical: true,
  stylize: false,
  aiRegenerate: false,
  aiEnhance: false,
  aiBackgroundRemoval: true,
  autoReplace: true,
  replaceFromApprovedLibrary: true,
  replaceWithGeneratedImage: false,
});

export const APPROVED_CROP_MODES: readonly CropMode[] = ['none', 'centerSquare', 'centerCircle', 'approvedFrame'];

export const PROTECTED_MIN_OPACITY = 0.85;
