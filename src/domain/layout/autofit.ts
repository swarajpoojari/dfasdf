import type { AutoFitPolicy, TextStyle } from '@/domain/types/elements';
import type { TextMeasurer } from './textMeasure';
import { wrapText } from './wrap';
import { clamp } from '@/domain/types/common';

export interface FittedText {
  readonly lines: readonly string[];
  readonly fontSize: number;
  /** Absolute line advance in design units, after any tightening. */
  readonly lineHeight: number;
  readonly height: number;
  /** False when the text still does not fit at the smallest permitted size. */
  readonly fits: boolean;
  /** True when maxLines clipped content — never allowed through validation. */
  readonly truncated: boolean;
}

const SIZE_STEP = 0.94;
const MAX_STEPS = 24;

function measureAt(
  text: string,
  width: number,
  style: TextStyle,
  fontSize: number,
  lineHeightScale: number,
  measurer: TextMeasurer,
  maxLines?: number,
): { lines: readonly string[]; lineHeight: number; height: number; truncated: boolean } {
  const measureStyle = {
    fontFamily: style.fontFamily,
    fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
  };
  const { lines, truncated } = wrapText(text, width, measureStyle, measurer, maxLines);
  const lineHeight = fontSize * style.lineHeight * lineHeightScale;
  return { lines, lineHeight, height: lines.length * lineHeight, truncated };
}

/**
 * Shrinks text — never below the policy floor — until it fits the box.
 *
 * Order of concessions matches how a designer would do it by hand:
 *   1. keep the authored size if it already fits;
 *   2. tighten line height to the permitted minimum;
 *   3. reduce font size in small steps down to `minFontSize`.
 *
 * If it still does not fit, the caller is told (`fits: false`) so the element
 * can grow instead, or validation can raise an overflow the user must resolve.
 * Text is never silently dropped.
 */
export function fitText(
  text: string,
  box: { width: number; height: number },
  style: TextStyle,
  policy: AutoFitPolicy,
  measurer: TextMeasurer,
  maxLines?: number,
): FittedText {
  const startSize = clamp(style.fontSize, policy.minFontSize, policy.maxFontSize);

  const atAuthored = measureAt(text, box.width, style, startSize, 1, measurer, maxLines);
  if (!policy.enabled || atAuthored.height <= box.height) {
    return {
      lines: atAuthored.lines,
      fontSize: startSize,
      lineHeight: atAuthored.lineHeight,
      height: atAuthored.height,
      fits: atAuthored.height <= box.height,
      truncated: atAuthored.truncated,
    };
  }

  const tightened = measureAt(text, box.width, style, startSize, policy.minLineHeightScale, measurer, maxLines);
  if (tightened.height <= box.height) {
    return {
      lines: tightened.lines,
      fontSize: startSize,
      lineHeight: tightened.lineHeight,
      height: tightened.height,
      fits: true,
      truncated: tightened.truncated,
    };
  }

  let fontSize = startSize;
  let best = tightened;
  for (let step = 0; step < MAX_STEPS; step += 1) {
    fontSize = Math.max(policy.minFontSize, fontSize * SIZE_STEP);
    const attempt = measureAt(text, box.width, style, fontSize, policy.minLineHeightScale, measurer, maxLines);
    best = attempt;
    if (attempt.height <= box.height) {
      return {
        lines: attempt.lines,
        fontSize,
        lineHeight: attempt.lineHeight,
        height: attempt.height,
        fits: true,
        truncated: attempt.truncated,
      };
    }
    if (fontSize <= policy.minFontSize) break;
  }

  return {
    lines: best.lines,
    fontSize,
    lineHeight: best.lineHeight,
    height: best.height,
    fits: false,
    truncated: best.truncated,
  };
}
