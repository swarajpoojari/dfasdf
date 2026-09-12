import { fitText } from '@/domain/layout/autofit';
import { wrapText, widestLine } from '@/domain/layout/wrap';
import { dominantScript, scriptRuns } from '@/domain/layout/script';
import { metricMeasurer } from '@/domain/layout/textMeasure';
import { POSTER_TEXT, autoFit } from '@/domain/templates/tokens';

const style = { fontFamily: 'poster-sans', fontSize: 30, fontWeight: 'regular' as const, letterSpacing: 0 };

describe('script detection', () => {
  it('identifies the dominant script of mixed strings', () => {
    expect(dominantScript('Shri Harish G. Amin')).toBe('latin');
    expect(dominantScript('श्री नारायण गुरु')).toBe('devanagari');
    expect(dominantScript('ಶ್ರೀ ನಾರಾಯಣ ಗುರು')).toBe('kannada');
    expect(dominantScript('श्री नारायण गुरु — 2026')).toBe('devanagari');
  });

  it('splits mixed text into runs so each is drawn with a covering font', () => {
    const runs = scriptRuns('Guru श्री');
    expect(runs.length).toBeGreaterThan(1);
    expect(runs.map((run) => run.script)).toContain('devanagari');
  });
});

describe('word wrap', () => {
  it('never returns a line wider than the box', () => {
    const text = 'Dharmadarshi Ramesh M. Poojary, Trustee of the Billawar Association Mumbai';
    const { lines } = wrapText(text, 300, style, metricMeasurer);
    expect(widestLine(lines, style, metricMeasurer)).toBeLessThanOrEqual(300);
  });

  it('honours explicit line breaks typed by the user', () => {
    const { lines } = wrapText('172nd Guru Jayanthi of\nBrahma Shree Narayana Guru Swami', 900, style, metricMeasurer);
    expect(lines).toHaveLength(2);
  });

  it('breaks a single over-long word rather than overflowing', () => {
    const { lines } = wrapText('Thiruvananthapuramkaranmarudhoorbeedu', 120, style, metricMeasurer);
    expect(lines.length).toBeGreaterThan(1);
    expect(widestLine(lines, style, metricMeasurer)).toBeLessThanOrEqual(120);
  });

  it('reports truncation instead of silently dropping lines', () => {
    const { lines, truncated } = wrapText(
      'one two three four five six seven eight nine ten eleven twelve',
      120,
      style,
      metricMeasurer,
      2,
    );
    expect(truncated).toBe(true);
    expect(lines).toHaveLength(2);
  });
});

describe('auto fit', () => {
  const policy = autoFit({ minFontSize: 20, maxFontSize: 64 });

  it('keeps the authored size when the text already fits', () => {
    const result = fitText('Guru Jayanti', { width: 900, height: 200 }, POSTER_TEXT.eventTitle, policy, metricMeasurer);
    expect(result.fontSize).toBe(POSTER_TEXT.eventTitle.fontSize);
    expect(result.fits).toBe(true);
  });

  it('shrinks long text to fit rather than clipping it', () => {
    const long =
      '172nd Guru Jayanthi of Brahma Shree Narayana Guru Swami organised by the Navi Mumbai Local Office';
    const result = fitText(long, { width: 600, height: 150 }, POSTER_TEXT.eventTitle, policy, metricMeasurer);
    expect(result.fits).toBe(true);
    expect(result.fontSize).toBeLessThan(POSTER_TEXT.eventTitle.fontSize);
    expect(result.height).toBeLessThanOrEqual(150);
  });

  it('never shrinks past the policy floor, and says so', () => {
    const veryLong = Array.from({ length: 80 }, () => 'Dharmadarshi Ramesh M. Poojary').join(' ');
    const result = fitText(veryLong, { width: 400, height: 120 }, POSTER_TEXT.personName, policy, metricMeasurer);
    expect(result.fontSize).toBeGreaterThanOrEqual(policy.minFontSize);
    expect(result.fits).toBe(false);
  });

  it('gives Devanagari and Kannada more vertical room than Latin', () => {
    const box = { width: 600, height: 400 };
    const latin = fitText('Shri Narayana Guru', box, POSTER_TEXT.personName, policy, metricMeasurer);
    const kannada = fitText('ಶ್ರೀ ನಾರಾಯಣ ಗುರು', box, POSTER_TEXT.personName, policy, metricMeasurer);
    expect(latin.lines).toHaveLength(1);
    expect(kannada.lines).toHaveLength(1);
  });
});
