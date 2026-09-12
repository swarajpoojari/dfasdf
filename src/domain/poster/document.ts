import { TEMPLATE_SCHEMA_VERSION, type PosterTemplate } from '@/domain/types/template';
import type { PosterDocument } from '@/domain/types/document';
import type { EventDetails } from '@/domain/types/content';
import { EMPTY_EVENT_DETAILS } from '@/domain/types/content';
import type { PosterElement } from '@/domain/types/elements';
import { isAssetBacked } from '@/domain/types/elements';
import type { LocalOffice } from '@/domain/types/office';
import { createId } from '@/utils/id';

export interface CreateDocumentInput {
  readonly template: PosterTemplate;
  readonly office: LocalOffice;
  readonly eventTypeId: string;
  readonly details?: Partial<EventDetails>;
  readonly title?: string;
}

/**
 * A new poster is the template's elements plus the user's content. The elements
 * are copied — not referenced — so that the association can publish version 2
 * of a template without silently changing posters that were already made.
 */
export function createPosterDocument({
  template,
  office,
  eventTypeId,
  details,
  title,
}: CreateDocumentInput): PosterDocument {
  const now = new Date().toISOString();
  const eventDetails: EventDetails = {
    ...EMPTY_EVENT_DETAILS,
    footerNote: office.defaultFooter,
    ...details,
  };

  return {
    id: createId('poster'),
    title: title ?? eventDetails.title ?? template.name,
    templateId: template.id,
    templateVersion: template.version,
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    localOfficeId: office.id,
    eventType: eventTypeId,
    eventDetails,
    elements: template.elements.map(cloneElement),
    assetIds: collectAssetIds(template.elements),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

function cloneElement(element: PosterElement): PosterElement {
  return { ...element, frame: { ...element.frame }, flow: { ...element.flow } } as PosterElement;
}

export function collectAssetIds(elements: readonly PosterElement[]): readonly string[] {
  const ids = new Set<string>();
  for (const element of elements) {
    if (isAssetBacked(element) && element.assetId) ids.add(element.assetId);
  }
  return [...ids];
}

export function touch(document: PosterDocument, patch: Partial<PosterDocument> = {}): PosterDocument {
  return {
    ...document,
    ...patch,
    assetIds: collectAssetIds(patch.elements ?? document.elements),
    updatedAt: new Date().toISOString(),
  };
}

export function updateDetails(document: PosterDocument, patch: Partial<EventDetails>): PosterDocument {
  return touch(document, { eventDetails: { ...document.eventDetails, ...patch } });
}

export interface MigrationReport {
  readonly document: PosterDocument;
  readonly changed: boolean;
  readonly notes: readonly string[];
}

/**
 * Re-applies a template to an existing poster.
 *
 * Because content lives in `eventDetails` and never inside the elements, a
 * template upgrade is a layout swap: the user's words survive untouched. The
 * few per-element properties a user can legitimately have changed — position,
 * size, visibility and chosen assets — are carried across by element id.
 */
export function migrateToTemplate(document: PosterDocument, template: PosterTemplate): MigrationReport {
  if (document.templateId === template.id && document.templateVersion === template.version) {
    return { document, changed: false, notes: [] };
  }

  const notes: string[] = [];
  const previous = new Map(document.elements.map((element) => [element.id, element]));

  const elements = template.elements.map((fresh) => {
    const old = previous.get(fresh.id);
    if (!old) return cloneElement(fresh);

    let merged: PosterElement = { ...cloneElement(fresh), visible: old.visible };
    if (isAssetBacked(merged) && isAssetBacked(old) && old.assetId) {
      merged = { ...merged, assetId: old.assetId } as PosterElement;
    }
    return merged;
  });

  const dropped = document.elements.filter((element) => !template.elements.some((e) => e.id === element.id));
  if (dropped.length > 0) {
    notes.push(
      `${dropped.length} item${dropped.length === 1 ? '' : 's'} from the previous template are not part of "${template.name}" and were removed.`,
    );
  }
  notes.push(`Updated to "${template.name}" version ${template.version}. Your text has been kept.`);

  return {
    document: touch(document, {
      templateId: template.id,
      templateVersion: template.version,
      schemaVersion: template.schemaVersion,
      elements,
    }),
    changed: true,
    notes,
  };
}

export function duplicateDocument(document: PosterDocument, title?: string): PosterDocument {
  const now = new Date().toISOString();
  return {
    ...document,
    id: createId('poster'),
    title: title ?? `${document.title} (copy)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    lastExportedAt: undefined,
    thumbnailUri: undefined,
  };
}
