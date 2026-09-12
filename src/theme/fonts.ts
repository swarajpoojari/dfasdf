import type { ScriptId } from '@/domain/layout/script';
import type { FontWeight } from '@/domain/types/elements';

/**
 * FONT REGISTRY
 *
 * Posters are never rendered with "whatever the phone happens to have". Every
 * text style names a family id from this registry, the registry names concrete
 * files, and the renderer refuses to fall back to an arbitrary system face —
 * otherwise the same poster would export differently on two Android phones.
 *
 * The families below are Noto / open-licence faces chosen for full coverage of
 * English, Hindi, Marathi (both Devanagari) and Kannada. The .ttf files are not
 * committed; see docs/ASSET_REPLACEMENT.md § Fonts for how to add them.
 */
export interface FontFaceFiles {
  readonly regular: string;
  readonly medium?: string;
  readonly semibold?: string;
  readonly bold?: string;
}

export interface FontMetrics {
  /** Mean advance width as a fraction of font size, used by the pure-TS measurer. */
  readonly avgAdvance: number;
  /** Cap-to-descender extent as a fraction of font size. */
  readonly contentHeight: number;
}

export interface FontFamilyDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly scripts: readonly ScriptId[];
  readonly files: FontFaceFiles;
  readonly metrics: FontMetrics;
  /** Used when a glyph is missing from this family. */
  readonly fallbackId?: string;
}

export const FONT_FAMILIES: readonly FontFamilyDefinition[] = [
  {
    id: 'poster-serif',
    displayName: 'Noto Serif',
    scripts: ['latin', 'other'],
    files: {
      regular: 'NotoSerif-Regular.ttf',
      medium: 'NotoSerif-Medium.ttf',
      semibold: 'NotoSerif-SemiBold.ttf',
      bold: 'NotoSerif-Bold.ttf',
    },
    metrics: { avgAdvance: 0.52, contentHeight: 0.72 },
  },
  {
    id: 'poster-sans',
    displayName: 'Noto Sans',
    scripts: ['latin', 'other'],
    files: {
      regular: 'NotoSans-Regular.ttf',
      medium: 'NotoSans-Medium.ttf',
      semibold: 'NotoSans-SemiBold.ttf',
      bold: 'NotoSans-Bold.ttf',
    },
    metrics: { avgAdvance: 0.5, contentHeight: 0.72 },
  },
  {
    id: 'poster-devanagari',
    displayName: 'Noto Sans Devanagari',
    scripts: ['devanagari'],
    files: {
      regular: 'NotoSansDevanagari-Regular.ttf',
      bold: 'NotoSansDevanagari-Bold.ttf',
    },
    // Devanagari needs more vertical room for matras above and below the line.
    metrics: { avgAdvance: 0.54, contentHeight: 0.92 },
    fallbackId: 'poster-sans',
  },
  {
    id: 'poster-kannada',
    displayName: 'Noto Sans Kannada',
    scripts: ['kannada'],
    files: {
      regular: 'NotoSansKannada-Regular.ttf',
      bold: 'NotoSansKannada-Bold.ttf',
    },
    metrics: { avgAdvance: 0.56, contentHeight: 0.95 },
    fallbackId: 'poster-sans',
  },
];

const BY_ID = new Map(FONT_FAMILIES.map((family) => [family.id, family]));

export function fontFamily(id: string): FontFamilyDefinition {
  const family = BY_ID.get(id);
  if (family) return family;
  // A template naming an unknown family is a template bug, not a user error;
  // we keep rendering with the base serif rather than dropping the text.
  return FONT_FAMILIES[0] as FontFamilyDefinition;
}

/**
 * Picks the family that actually covers the text's script. A template may say
 * `poster-serif`; if the user types Kannada into that field we render Kannada
 * with the Kannada face instead of showing tofu.
 */
export function resolveFamilyForScript(preferredId: string, script: ScriptId): FontFamilyDefinition {
  const preferred = fontFamily(preferredId);
  if (preferred.scripts.includes(script)) return preferred;
  const covering = FONT_FAMILIES.find((family) => family.scripts.includes(script));
  return covering ?? preferred;
}

export function fontFileFor(family: FontFamilyDefinition, weight: FontWeight): string {
  switch (weight) {
    case 'bold':
      return family.files.bold ?? family.files.semibold ?? family.files.regular;
    case 'semibold':
      return family.files.semibold ?? family.files.bold ?? family.files.medium ?? family.files.regular;
    case 'medium':
      return family.files.medium ?? family.files.regular;
    case 'regular':
    default:
      return family.files.regular;
  }
}

/** Every distinct file the app needs to load at start-up. */
export function allFontFiles(): readonly string[] {
  const files = new Set<string>();
  for (const family of FONT_FAMILIES) {
    for (const file of Object.values(family.files)) {
      if (file) files.add(file);
    }
  }
  return [...files];
}

export const FONT_DIRECTORY = 'assets/fonts';
