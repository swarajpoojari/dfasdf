export type ScriptId = 'latin' | 'devanagari' | 'kannada' | 'other';

interface ScriptRange {
  readonly script: ScriptId;
  readonly from: number;
  readonly to: number;
}

const RANGES: readonly ScriptRange[] = [
  { script: 'devanagari', from: 0x0900, to: 0x097f },
  { script: 'devanagari', from: 0xa8e0, to: 0xa8ff }, // Devanagari Extended
  { script: 'kannada', from: 0x0c80, to: 0x0cff },
  { script: 'latin', from: 0x0041, to: 0x024f },
];

export function scriptOfCodePoint(codePoint: number): ScriptId {
  for (const range of RANGES) {
    if (codePoint >= range.from && codePoint <= range.to) return range.script;
  }
  return 'other';
}

const IGNORABLE = /[\s\d\p{P}\p{S}]/u;

/**
 * The dominant script of a string, ignoring digits, spaces and punctuation so
 * that "Shri Rajesh Poojary (GST)" is latin and "श्री नारायण गुरु — 2026" is
 * devanagari. Mixed strings resolve to the script with the most characters,
 * which is what picks the primary font; per-run fallback happens at paint time.
 */
export function dominantScript(text: string): ScriptId {
  const counts: Record<ScriptId, number> = { latin: 0, devanagari: 0, kannada: 0, other: 0 };
  for (const char of text) {
    if (IGNORABLE.test(char)) continue;
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    counts[scriptOfCodePoint(codePoint)] += 1;
  }

  let best: ScriptId = 'latin';
  let bestCount = 0;
  for (const script of ['latin', 'devanagari', 'kannada', 'other'] as const) {
    if (counts[script] > bestCount) {
      best = script;
      bestCount = counts[script];
    }
  }
  return bestCount === 0 ? 'latin' : best;
}

/** Splits text into maximal same-script runs, for per-run font fallback. */
export function scriptRuns(text: string): readonly { script: ScriptId; text: string }[] {
  const runs: { script: ScriptId; text: string }[] = [];
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    const script = codePoint === undefined || IGNORABLE.test(char) ? undefined : scriptOfCodePoint(codePoint);
    const last = runs[runs.length - 1];
    if (last && (script === undefined || script === last.script)) {
      last.text += char;
    } else {
      runs.push({ script: script ?? 'latin', text: char });
    }
  }
  return runs;
}

export function containsIndicScript(text: string): boolean {
  const script = dominantScript(text);
  return script === 'devanagari' || script === 'kannada';
}
