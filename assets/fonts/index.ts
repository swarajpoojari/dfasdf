/**
 * FONT BUNDLE
 * ===========
 *
 * Poster rendering must be deterministic: the same poster has to export
 * identically on every device, which rules out "whatever font the phone has".
 * The families the templates use are declared in `src/theme/fonts.ts`; the
 * actual .ttf files are mapped to bundler handles here.
 *
 * The map ships empty because font binaries are not committed to this
 * repository. Add the files (Noto Serif, Noto Sans, Noto Sans Devanagari, Noto
 * Sans Kannada — all SIL Open Font Licence) to `assets/fonts/` and register
 * them:
 *
 *   'NotoSerif-Regular.ttf': require('./NotoSerif-Regular.ttf'),
 *
 * Until then the renderer falls back to the platform's default face and the app
 * shows a setup warning, so a missing font is visible rather than silent.
 * See docs/ASSET_REPLACEMENT.md § Fonts.
 */
export const FONT_MODULES: Readonly<Record<string, number>> = {};
