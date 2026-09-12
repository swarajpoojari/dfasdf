import { assetRegistry } from '@/domain/assets/registry';
import { createPosterDocument } from '@/domain/poster/document';
import { SAMPLE_GURU_JAYANTI } from '@/domain/poster/sampleData';
import { findOffice, LOCAL_OFFICES } from '@/domain/offices/offices';
import { templateRegistry } from '@/domain/templates/registry';
import { metricMeasurer } from '@/domain/layout/textMeasure';
import { layoutPoster, type LayoutInput } from '@/domain/layout/engine';
import { ASSOCIATION_SLOTS, officeLogoSlot } from '@/domain/assets/slots';
import type { AssetCategory, OfficialAsset } from '@/domain/types/assets';
import type { PosterDocument } from '@/domain/types/document';
import type { EventDetails } from '@/domain/types/content';
import type { LocalOffice } from '@/domain/types/office';

export const GURU_JAYANTI_TEMPLATE_ID = 'tpl.guru-jayanti.classic';

export function testOffice(): LocalOffice {
  const office = findOffice('navi-mumbai') ?? LOCAL_OFFICES[0];
  if (!office) throw new Error('No office configured');
  return office;
}

export function makeAsset(overrides: Partial<OfficialAsset> & { id: string; category: AssetCategory }): OfficialAsset {
  return {
    name: overrides.id,
    source: { kind: 'bundled', module: 1 },
    type: 'image/png',
    width: 1000,
    height: 1000,
    checksum: 'deadbeef',
    version: 1,
    approved: true,
    protected: true,
    ...overrides,
  };
}

export function makeDocument(details: Partial<EventDetails> = {}): PosterDocument {
  const template = templateRegistry.get(GURU_JAYANTI_TEMPLATE_ID);
  if (!template) throw new Error('Guru Jayanti template missing');
  return createPosterDocument({
    template,
    office: testOffice(),
    eventTypeId: 'guru-jayanti',
    details: { ...SAMPLE_GURU_JAYANTI, ...details },
  });
}

const slots = [
  ...ASSOCIATION_SLOTS,
  ...LOCAL_OFFICES.map((office) => officeLogoSlot(office.id, office.name)),
];

export function layoutFor(document: PosterDocument, overrides: Partial<LayoutInput> = {}) {
  const template = templateRegistry.get(document.templateId);
  if (!template) throw new Error('Template missing');
  return layoutPoster({
    document,
    template,
    office: testOffice(),
    measurer: metricMeasurer,
    lookupAsset: (id) => assetRegistry.get(id),
    lookupSlot: (id) => slots.find((slot) => slot.id === id),
    ...overrides,
  });
}

export function elementById(document: PosterDocument, id: string) {
  const element = document.elements.find((candidate) => candidate.id === id);
  if (!element) throw new Error(`Element "${id}" not found`);
  return element;
}

export function frameOf(layout: ReturnType<typeof layoutFor>, elementId: string) {
  const placed = layout.elements.find((candidate) => candidate.elementId === elementId);
  if (!placed) throw new Error(`Element "${elementId}" was not laid out`);
  return placed;
}
