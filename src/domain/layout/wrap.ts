import type { MeasureStyle, TextMeasurer } from './textMeasure';

export interface WrapResult {
  readonly lines: readonly string[];
  /** True when `maxLines` forced content to be dropped. */
  readonly truncated: boolean;
}

/** Points at which a line may break, in addition to spaces. */
const SOFT_BREAK_AFTER = new Set([...'-–—/,;)।॥']);

function splitIntoTokens(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (const char of text) {
    current += char;
    if (char === ' ' || SOFT_BREAK_AFTER.has(char)) {
      tokens.push(current);
      current = '';
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/** Breaks a single token that is wider than the whole line, grapheme by grapheme. */
function hardBreak(
  token: string,
  maxWidth: number,
  style: MeasureStyle,
  measurer: TextMeasurer,
): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const char of token) {
    const candidate = current + char;
    if (current && measurer.measureWidth(candidate, style) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Greedy word wrap. Explicit newlines in the source are always honoured — a
 * user who pressed Enter meant it.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  style: MeasureStyle,
  measurer: TextMeasurer,
  maxLines?: number,
): WrapResult {
  if (!text) return { lines: [''], truncated: false };
  if (maxWidth <= 0) return { lines: [text], truncated: false };

  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    let current = '';
    for (const token of splitIntoTokens(paragraph)) {
      const candidate = current + token;
      if (current && measurer.measureWidth(candidate.trimEnd(), style) > maxWidth) {
        lines.push(current.trimEnd());
        current = token.trimStart();
      } else {
        current = candidate;
      }

      if (measurer.measureWidth(current.trimEnd(), style) > maxWidth) {
        const pieces = hardBreak(current.trimEnd(), maxWidth, style, measurer);
        const last = pieces.pop() ?? '';
        lines.push(...pieces);
        current = last;
      }
    }
    lines.push(current.trimEnd());
  }

  if (maxLines !== undefined && lines.length > maxLines) {
    return { lines: lines.slice(0, maxLines), truncated: true };
  }
  return { lines, truncated: false };
}

export function widestLine(
  lines: readonly string[],
  style: MeasureStyle,
  measurer: TextMeasurer,
): number {
  return lines.reduce((widest, line) => Math.max(widest, measurer.measureWidth(line, style)), 0);
}
