import { DESIGN_CANVAS } from '@/domain/types/canvas';
import { SAMPLE_ANNOUNCEMENT } from '@/domain/poster/sampleData';
import { updateDetails } from '@/domain/poster/document';
import type { FelicitationEntry } from '@/domain/types/content';
import { frameOf, layoutFor, makeDocument } from './fixtures';

function longFelicitations(count: number): readonly FelicitationEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `f${index}`,
    name: `Shri Rajesh Poojary ${index + 1}`,
    designation: 'Asst. Commissioner, GST',
    description:
      'For distinguished service in public administration over more than two decades, and for sustained support to the association’s education initiatives.',
    bullets: [
      'Topped the departmental examination',
      'Led the Mumbai zone taxpayer outreach programme',
      'Mentors students of the coaching scheme',
    ],
  }));
}

describe('poster layout engine', () => {
  it('lays out every visible element of the sample poster', () => {
    const layout = layoutFor(makeDocument());
    expect(layout.canvas).toEqual(DESIGN_CANVAS);
    expect(layout.nodes.length).toBeGreaterThan(20);
    expect(layout.elements.length).toBeGreaterThan(10);
  });

  it('re-flows the felicitation section down when the guest list grows', () => {
    const short = makeDocument({ guests: [] });
    const long = makeDocument();

    const shortTop = frameOf(layoutFor(short), 'felicitation-list').frame.y;
    const longTop = frameOf(layoutFor(long), 'felicitation-list').frame.y;

    expect(longTop).toBeGreaterThan(shortTop);
  });

  it('grows a section to fit long felicitation citations', () => {
    const short = frameOf(layoutFor(makeDocument({ guests: [], felicitations: [] })), 'felicitation-list');
    const long = frameOf(layoutFor(makeDocument({ guests: [], felicitations: longFelicitations(2) })), 'felicitation-list');

    expect(long.grew).toBe(true);
    expect(long.frame.height).toBeGreaterThan(short.frame.height);
  });

  it('keeps the footer where the template put it, whatever the content does', () => {
    const shortFooter = frameOf(layoutFor(makeDocument({ felicitations: [] })), 'footer-note').frame.y;
    const longFooter = frameOf(layoutFor(makeDocument({ felicitations: longFelicitations(5) })), 'footer-note').frame.y;
    expect(longFooter).toBe(shortFooter);
  });

  it('reports an overflow rather than clipping impossible amounts of content', () => {
    const layout = layoutFor(makeDocument({ felicitations: longFelicitations(14) }));
    const overflow = layout.issues.filter((issue) => issue.code === 'TEXT_OVERFLOW');
    expect(overflow.length).toBeGreaterThan(0);
    expect(overflow[0]?.autoFixable).toBe(true);
    expect(overflow[0]?.message).toMatch(/longer than the space|too long/i);
  });

  it('leaves type at its authored size when the content is short', () => {
    const roomy = layoutFor(makeDocument({ guests: [], felicitations: [] }));
    expect(frameOf(roomy, 'guest-list').fontScale).toBe(1);
  });

  it('compresses within the permitted limits before complaining', () => {
    const roomy = layoutFor(makeDocument({ guests: [], felicitations: longFelicitations(1) }));
    const tight = layoutFor(makeDocument({ guests: [], felicitations: longFelicitations(6) }));

    const roomyScale = frameOf(roomy, 'felicitation-list').fontScale;
    const tightScale = frameOf(tight, 'felicitation-list').fontScale;

    expect(roomyScale).toBe(1);
    expect(tightScale).toBeLessThan(roomyScale);
    expect(tightScale).toBeGreaterThanOrEqual(0.7);
  });

  it('lays the sample Guru Jayanti poster out with no overflow', () => {
    const layout = layoutFor(makeDocument());
    const codes = layout.issues.map((issue) => issue.code);
    expect(codes).not.toContain('TEXT_OVERFLOW');
    expect(codes).not.toContain('TEXT_TRUNCATED');
    expect(codes).not.toContain('ELEMENT_OVERLAP');
    // The two official images are not installed in this repository, so those
    // are the only findings that remain.
    expect(new Set(codes)).toEqual(new Set(['MISSING_ASSET']));
  });

  it('flags the missing official logo and Guru image as placeholders in the editor', () => {
    const layout = layoutFor(makeDocument());
    const placeholders = layout.nodes.filter((node) => node.kind === 'placeholder');
    expect(placeholders.length).toBeGreaterThanOrEqual(2);

    const missing = layout.issues.filter((issue) => issue.code === 'MISSING_ASSET');
    expect(missing.some((issue) => issue.message.includes('Approved asset required'))).toBe(true);
  });

  it('draws no placeholders when exporting', () => {
    const layout = layoutFor(makeDocument(), { mode: 'export' });
    expect(layout.nodes.some((node) => node.kind === 'placeholder')).toBe(false);
  });

  it('keeps every element inside the canvas for the sample posters', () => {
    for (const details of [undefined, SAMPLE_ANNOUNCEMENT]) {
      const document = details ? updateDetails(makeDocument(), details) : makeDocument();
      const layout = layoutFor(document);
      expect(layout.issues.filter((issue) => issue.code === 'ELEMENT_OUTSIDE_CANVAS')).toHaveLength(0);
    }
  });

  it('produces the same layout twice for the same document', () => {
    const document = makeDocument();
    const first = layoutFor(document);
    const second = layoutFor(document);
    expect(JSON.stringify(second.nodes)).toEqual(JSON.stringify(first.nodes));
  });
});
