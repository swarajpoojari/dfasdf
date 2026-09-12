import { validatePoster } from '@/domain/validation/engine';
import { applyAutoFix } from '@/domain/validation/autofix';
import { replaceAsset } from '@/domain/poster/operations';
import { updateDetails } from '@/domain/poster/document';
import { findEventType } from '@/domain/eventTypes/eventTypes';
import { templateRegistry } from '@/domain/templates/registry';
import { ASSOCIATION_SLOTS, officeLogoSlot } from '@/domain/assets/slots';
import { LOCAL_OFFICES } from '@/domain/offices/offices';
import { DESIGN_CANVAS } from '@/domain/types/canvas';
import type { OfficialAsset } from '@/domain/types/assets';
import type { PosterDocument } from '@/domain/types/document';
import { isListElement, type PosterElement } from '@/domain/types/elements';
import { GURU_JAYANTI_TEMPLATE_ID, layoutFor, makeAsset, makeDocument, testOffice } from './fixtures';

const logo = makeAsset({ id: 'logo', category: 'ASSOCIATION_LOGO', name: 'Association logo', width: 1200, height: 1200 });
const guru = makeAsset({ id: 'guru', category: 'GURU_IMAGE', name: 'Narayana Guru', width: 900, height: 1100 });
const assets: Record<string, OfficialAsset> = { logo, guru };

const slots = [...ASSOCIATION_SLOTS, ...LOCAL_OFFICES.map((office) => officeLogoSlot(office.id, office.name))];
const lookupAsset = (id: string): OfficialAsset | undefined => assets[id];
const lookupSlot = (id: string) => slots.find((slot) => slot.id === id);

function report(document: PosterDocument) {
  const template = templateRegistry.get(document.templateId)!;
  const layout = layoutFor(document, { lookupAsset });
  return validatePoster({
    document,
    template,
    office: testOffice(),
    eventType: findEventType(document.eventType),
    layout,
    lookupAsset,
    lookupSlot,
  });
}

function minFontSizeOf(element: PosterElement | undefined): number {
  if (!element || !isListElement(element)) throw new Error('Expected a list section');
  return element.autoFit.minFontSize;
}

function fullyDressed(): PosterDocument {
  let document = makeDocument();
  const withLogo = replaceAsset(document, 'association-logo', logo, { lookupAsset });
  if (!withLogo.ok) throw new Error(withLogo.error);
  document = withLogo.value;
  const withGuru = replaceAsset(document, 'hero-image', guru, { lookupAsset });
  if (!withGuru.ok) throw new Error(withGuru.error);
  return withGuru.value;
}

describe('poster validation', () => {
  it('blocks export while the official logo is missing', () => {
    const result = report(makeDocument());
    expect(result.canExport).toBe(false);
    const finding = result.findings.find((f) => f.ruleId === 'official-logo');
    expect(finding?.message).toContain('Approved asset required');
  });

  it('blocks export while a required Guru image is missing', () => {
    const withLogo = replaceAsset(makeDocument(), 'association-logo', logo, { lookupAsset });
    expect(withLogo.ok).toBe(true);
    if (!withLogo.ok) return;

    const result = report(withLogo.value);
    expect(result.canExport).toBe(false);
    expect(result.findings.some((f) => f.ruleId === 'required-assets')).toBe(true);
  });

  it('passes once both official images are placed and the details are complete', () => {
    const result = report(fullyDressed());
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
    expect(result.canExport).toBe(true);
  });

  it('blocks export when the title, date or venue is missing', () => {
    for (const patch of [{ title: '' }, { dateLabel: undefined, date: undefined }, { venue: undefined }]) {
      const result = report(updateDetails(fullyDressed(), patch));
      expect(result.canExport).toBe(false);
    }
  });

  it('warns rather than blocks when an image is too small for its frame', () => {
    const small = makeAsset({ id: 'guru', category: 'GURU_IMAGE', name: 'Low-res Guru', width: 90, height: 110 });
    const document = fullyDressed();
    const result = validatePoster({
      document,
      template: templateRegistry.get(GURU_JAYANTI_TEMPLATE_ID)!,
      office: testOffice(),
      eventType: findEventType('guru-jayanti'),
      layout: layoutFor(document, { lookupAsset: (id) => (id === 'guru' ? small : assets[id]) }),
      lookupAsset: (id) => (id === 'guru' ? small : assets[id]),
      lookupSlot,
    });

    const finding = result.findings.find((f) => f.ruleId === 'image-resolution');
    expect(finding?.severity).toBe('warning');
    expect(result.canExport).toBe(true);
  });

  it('warns when the template has moved on to a newer version', () => {
    const document = { ...fullyDressed(), templateVersion: 0 };
    const result = report(document);
    expect(result.findings.some((f) => f.ruleId === 'template-version')).toBe(true);
    expect(result.canExport).toBe(true);
  });

  it('produces a tick-list covering every rule', () => {
    const result = report(fullyDressed());
    expect(result.checks.length).toBeGreaterThan(8);
    expect(result.checks.every((check) => typeof check.title === 'string')).toBe(true);
  });
});

describe('automatic fixes', () => {
  it('tightens an overflowing section within the template’s limits', () => {
    const document = fullyDressed();
    const before = minFontSizeOf(document.elements.find((element) => element.id === 'felicitation-list'));
    const result = applyAutoFix(
      document,
      { label: 'Fix Automatically', description: '', kind: 'relax-section', elementId: 'felicitation-list' },
      DESIGN_CANVAS,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const after = minFontSizeOf(result.value.elements.find((element) => element.id === 'felicitation-list'));
      expect(after).toBeLessThan(before);
      expect(after).toBeGreaterThanOrEqual(15);
    }
  });

  it('says plainly when there is nothing left to tighten', () => {
    let document = fullyDressed();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = applyAutoFix(
        document,
        { label: '', description: '', kind: 'relax-section', elementId: 'felicitation-list' },
        DESIGN_CANVAS,
      );
      if (!result.ok) {
        expect(result.error).toMatch(/shorten the text/i);
        return;
      }
      document = result.value;
    }
    throw new Error('relax-section never reached its floor');
  });

  it('nudges an element that has drifted off the poster back inside', () => {
    const document = fullyDressed();
    const moved = {
      ...document,
      elements: document.elements.map((element) =>
        element.id === 'event-subtitle' ? { ...element, frame: { ...element.frame, x: 2000, y: -80 } } : element,
      ),
    };

    const result = applyAutoFix(
      moved,
      { label: '', description: '', kind: 'nudge-into-canvas', elementId: 'event-subtitle' },
      DESIGN_CANVAS,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const frame = result.value.elements.find((element) => element.id === 'event-subtitle')!.frame;
      expect(frame.x).toBeGreaterThanOrEqual(48);
      expect(frame.y).toBeGreaterThanOrEqual(48);
      expect(frame.x + frame.width).toBeLessThanOrEqual(DESIGN_CANVAS.width - 48);
    }
  });
});
