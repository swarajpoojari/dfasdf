import { Skia, type SkFont } from '@shopify/react-native-skia';

import type { LineMetrics, MeasureStyle, TextMeasurer } from '@/domain/layout/textMeasure';
import { fontFileFor, fontFamily } from '@/theme/fonts';
import { metricMeasurer } from '@/domain/layout/textMeasure';
import type { PosterResources } from './resources';

/**
 * Skia-backed measurer used by the editor and export.
 *
 * When a font file has not been installed there is no real face to measure
 * with; rather than measuring with a system fallback (whose metrics differ per
 * device and would make layout non-deterministic), we fall back to the pure-TS
 * metric measurer, which at least behaves the same everywhere.
 */
export function createSkiaMeasurer(resources: PosterResources): TextMeasurer {
  const cache = new Map<string, SkFont>();

  const fontFor = (style: MeasureStyle): SkFont | undefined => {
    const family = fontFamily(style.fontFamily);
    const file = fontFileFor(family, style.fontWeight);
    const typeface = resources.typeface(file);
    if (!typeface) return undefined;

    const key = `${file}@${style.fontSize}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const font = Skia.Font(typeface, style.fontSize);
    cache.set(key, font);
    return font;
  };

  return {
    measureWidth(text: string, style: MeasureStyle): number {
      const font = fontFor(style);
      if (!font) return metricMeasurer.measureWidth(text, style);
      const spacing = Math.max(0, text.length - 1) * style.letterSpacing;
      return font.getTextWidth(text) + spacing;
    },

    lineMetrics(style: MeasureStyle): LineMetrics {
      const font = fontFor(style);
      if (!font) return metricMeasurer.lineMetrics(style);
      const metrics = font.getMetrics();
      return { ascent: Math.abs(metrics.ascent), descent: Math.abs(metrics.descent) };
    },
  };
}
