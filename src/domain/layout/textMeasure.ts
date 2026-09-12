import { dominantScript, scriptRuns, type ScriptId } from '@/domain/layout/script';
import { fontFamily, resolveFamilyForScript, type FontFamilyDefinition } from '@/theme/fonts';
import type { FontWeight } from '@/domain/types/elements';

export interface MeasureStyle {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly letterSpacing: number;
}

export interface LineMetrics {
  readonly ascent: number;
  readonly descent: number;
}

/**
 * Text measurement is an interface, not a concrete implementation, because the
 * same layout code runs in three places:
 *
 *   - the editor and export path, backed by real Skia font metrics;
 *   - unit tests and the CI visual-regression baseline, backed by the
 *     deterministic metric measurer below;
 *   - template authoring tools.
 *
 * Layout itself stays pure, which is what makes the exported poster identical
 * to the preview rather than "close enough".
 */
export interface TextMeasurer {
  measureWidth(text: string, style: MeasureStyle): number;
  lineMetrics(style: MeasureStyle): LineMetrics;
}

/* -------------------------------------------------------------------------- */
/* Deterministic metric measurer                                              */
/* -------------------------------------------------------------------------- */

const NARROW = new Set([...'ijltfrI.,:;\'`|!()[]{}-']);
const WIDE = new Set([...'mwMW@%']);
const UPPER_FACTOR = 1.08;

function latinRunWidth(text: string, family: FontFamilyDefinition, fontSize: number): number {
  let advance = 0;
  for (const char of text) {
    if (char === ' ') {
      advance += family.metrics.avgAdvance * 0.5;
    } else if (NARROW.has(char)) {
      advance += family.metrics.avgAdvance * 0.45;
    } else if (WIDE.has(char)) {
      advance += family.metrics.avgAdvance * 1.45;
    } else if (char >= 'A' && char <= 'Z') {
      advance += family.metrics.avgAdvance * UPPER_FACTOR;
    } else {
      advance += family.metrics.avgAdvance;
    }
  }
  return advance * fontSize;
}

/**
 * Indic clusters are shaped, so character count overstates width: combining
 * matras and viramas add no advance of their own.
 */
const DEVANAGARI_COMBINING = /[ऀ-ःऺ-ॏ॑-ॗॢॣ]/u;
const KANNADA_COMBINING = /[ಁ-ಃ಼-್ೕೖೢೣ]/u;

function indicRunWidth(text: string, family: FontFamilyDefinition, fontSize: number, script: ScriptId): number {
  const combining = script === 'kannada' ? KANNADA_COMBINING : DEVANAGARI_COMBINING;
  let base = 0;
  for (const char of text) {
    if (char === ' ') base += 0.5;
    else if (combining.test(char)) base += 0.12;
    else base += 1;
  }
  return base * family.metrics.avgAdvance * fontSize;
}

/**
 * A pure-TypeScript measurer. It is an approximation of a real shaper, but a
 * *stable* one: it never changes between runs, devices or OS versions, so
 * layout tests assert real numbers.
 */
export function createMetricMeasurer(): TextMeasurer {
  return {
    measureWidth(text, style) {
      if (!text) return 0;
      let width = 0;
      for (const run of scriptRuns(text)) {
        const family = resolveFamilyForScript(style.fontFamily, run.script);
        width +=
          run.script === 'devanagari' || run.script === 'kannada'
            ? indicRunWidth(run.text, family, style.fontSize, run.script)
            : latinRunWidth(run.text, family, style.fontSize);
      }
      const weightFactor = style.fontWeight === 'bold' ? 1.04 : style.fontWeight === 'semibold' ? 1.02 : 1;
      return width * weightFactor + Math.max(0, text.length - 1) * style.letterSpacing;
    },

    lineMetrics(style) {
      const family = fontFamily(style.fontFamily);
      const content = family.metrics.contentHeight * style.fontSize;
      return { ascent: content * 0.78, descent: content * 0.22 };
    },
  };
}

/** Chooses the family a given string should actually be drawn with. */
export function familyForText(text: string, preferredFamilyId: string): FontFamilyDefinition {
  return resolveFamilyForScript(preferredFamilyId, dominantScript(text));
}

export const metricMeasurer: TextMeasurer = createMetricMeasurer();
