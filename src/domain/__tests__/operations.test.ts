import {
  duplicateElement,
  moveElement,
  removeElement,
  replaceAsset,
  resizeElement,
  setElementOpacity,
  setLiteralText,
} from '@/domain/poster/operations';
import { canRedo, canUndo, commit, createHistory, redo, undo } from '@/domain/poster/history';
import { duplicateDocument, migrateToTemplate, updateDetails } from '@/domain/poster/document';
import { templateRegistry } from '@/domain/templates/registry';
import type { OfficialAsset } from '@/domain/types/assets';
import { GURU_JAYANTI_TEMPLATE_ID, makeAsset, makeDocument } from './fixtures';

const logo = makeAsset({ id: 'logo', category: 'ASSOCIATION_LOGO', width: 1200, height: 400 });
const decoration = makeAsset({
  id: 'border',
  category: 'DECORATION',
  width: 1000,
  height: 200,
  protected: false,
});
const unapproved = makeAsset({ id: 'draft-logo', category: 'ASSOCIATION_LOGO', approved: false });

const assets: Record<string, OfficialAsset> = { logo, border: decoration, 'draft-logo': unapproved };
const ctx = { lookupAsset: (id: string) => assets[id], snapToGrid: false };

function documentWithLogo() {
  const document = makeDocument();
  const placed = replaceAsset(document, 'association-logo', logo, ctx);
  if (!placed.ok) throw new Error(placed.error);
  return placed.value;
}

describe('element operations', () => {
  it('moves an unlocked element', () => {
    const document = makeDocument();
    const before = document.elements.find((element) => element.id === 'event-title')!.frame;
    const result = moveElement(document, 'event-title', { dx: 10, dy: -20 }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const after = result.value.elements.find((element) => element.id === 'event-title')!.frame;
      expect(after.x).toBe(before.x + 10);
      expect(after.y).toBe(before.y - 20);
    }
  });

  it('snaps to the grid when snapping is on', () => {
    const result = moveElement(makeDocument(), 'event-title', { dx: 7, dy: 7 }, { ...ctx, snapToGrid: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const frame = result.value.elements.find((element) => element.id === 'event-title')!.frame;
      expect(frame.x % 12).toBe(0);
    }
  });

  it('refuses to move a locked element, with a readable reason', () => {
    const result = moveElement(makeDocument(), 'association-logo', { dx: 10, dy: 0 }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/locked/i);
  });

  it('never stretches a protected asset, whatever size is requested', () => {
    const document = documentWithLogo();
    const unlocked = { ...document, elements: document.elements.map((e) => (e.id === 'association-logo' ? { ...e, locked: false } : e)) };

    const result = resizeElement(unlocked, 'association-logo', { width: 600, height: 60 }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const frame = result.value.elements.find((element) => element.id === 'association-logo')!.frame;
      // The asset is 1200 × 400, so the frame must stay at 3:1.
      expect(frame.width / frame.height).toBeCloseTo(3, 1);
    }
  });

  it('allows free resizing of unprotected artwork', () => {
    const document = makeDocument();
    const withDecoration = {
      ...document,
      elements: document.elements.map((element) =>
        element.id === 'hero-image' ? { ...element, assetId: 'border', locked: false } : element,
      ),
    };
    const result = resizeElement(withDecoration, 'hero-image', { width: 400, height: 100 }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const frame = result.value.elements.find((element) => element.id === 'hero-image')!.frame;
      expect(frame.width).toBe(400);
      expect(frame.height).toBe(100);
    }
  });

  it('refuses to place an unapproved image', () => {
    const result = replaceAsset(makeDocument(), 'association-logo', unapproved, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Approved asset required');
  });

  it('keeps protected assets clearly visible when opacity is changed', () => {
    const document = documentWithLogo();
    expect(setElementOpacity(document, 'association-logo', 0.3, ctx).ok).toBe(false);
    expect(setElementOpacity(document, 'association-logo', 0.9, ctx).ok).toBe(true);
  });

  it('sends bound text back to the event details rather than editing it in place', () => {
    const result = setLiteralText(makeDocument(), 'event-title', 'Something else');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/event details/i);
  });

  it('refuses to delete part of the official layout but allows hiding', () => {
    const result = removeElement(makeDocument(), 'association-logo');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/hide it instead/i);
  });

  it('gives a duplicate its own identity and takes it out of the flow', () => {
    const result = duplicateElement(makeDocument(), 'event-subtitle');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const copy = result.value.elements[result.value.elements.length - 1]!;
      expect(copy.id).not.toBe('event-subtitle');
      expect(copy.flow.group).toBeUndefined();
      expect(copy.flow.pinned).toBe(true);
    }
  });
});

describe('document lifecycle', () => {
  it('keeps the typed content when the template is upgraded', () => {
    const document = updateDetails(makeDocument(), { title: 'A title nobody wants to retype' });
    const template = templateRegistry.get(GURU_JAYANTI_TEMPLATE_ID)!;
    const upgraded = migrateToTemplate(document, { ...template, version: 2 });

    expect(upgraded.changed).toBe(true);
    expect(upgraded.document.eventDetails.title).toBe('A title nobody wants to retype');
    expect(upgraded.document.templateVersion).toBe(2);
    expect(upgraded.notes.join(' ')).toMatch(/text has been kept/i);
  });

  it('carries the chosen official assets across a template upgrade', () => {
    const document = documentWithLogo();
    const template = templateRegistry.get(GURU_JAYANTI_TEMPLATE_ID)!;
    const upgraded = migrateToTemplate(document, { ...template, version: 3 });
    const element = upgraded.document.elements.find((candidate) => candidate.id === 'association-logo')!;
    expect('assetId' in element ? element.assetId : undefined).toBe('logo');
  });

  it('duplicates a poster as a fresh draft', () => {
    const original = makeDocument();
    const copy = duplicateDocument(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.status).toBe('draft');
    expect(copy.eventDetails).toEqual(original.eventDetails);
  });
});

describe('undo and redo', () => {
  it('steps back and forward through committed edits', () => {
    const first = makeDocument();
    const second = updateDetails(first, { title: 'Second' });
    const third = updateDetails(second, { title: 'Third' });

    let history = createHistory(first);
    history = commit(history, second);
    history = commit(history, third);

    expect(canUndo(history)).toBe(true);
    history = undo(history);
    expect(history.present.eventDetails.title).toBe('Second');

    history = undo(history);
    expect(history.present.eventDetails.title).toBe(first.eventDetails.title);
    expect(canUndo(history)).toBe(false);

    history = redo(history);
    expect(history.present.eventDetails.title).toBe('Second');
    expect(canRedo(history)).toBe(true);
  });

  it('drops the redo stack once a new edit is committed', () => {
    let history = createHistory(makeDocument());
    history = commit(history, updateDetails(history.present, { title: 'A' }));
    history = undo(history);
    history = commit(history, updateDetails(history.present, { title: 'B' }));
    expect(canRedo(history)).toBe(false);
  });
});
