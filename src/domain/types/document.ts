import type { EventDetails } from './content';
import type { PosterElement } from './elements';

export type PosterStatus = 'draft' | 'ready' | 'exported';

/**
 * A saved poster.
 *
 * `eventDetails` is the content, `elements` is the presentation, and the two are
 * kept apart on purpose: re-rendering a poster into an updated template keeps
 * every word the user typed, and editing a word never disturbs the layout
 * authored by the association.
 *
 * `elements` starts as a copy of the template's elements and records only what
 * the user changed. That is what makes a poster fully editable after reopening —
 * it is never flattened to an image.
 */
export interface PosterDocument {
  readonly id: string;
  readonly title: string;
  readonly templateId: string;
  readonly templateVersion: number;
  readonly schemaVersion: number;
  readonly localOfficeId: string;
  readonly eventType: string;
  readonly eventDetails: EventDetails;
  readonly elements: readonly PosterElement[];
  /** Asset ids referenced by this poster, for offline pre-caching and audit. */
  readonly assetIds: readonly string[];
  readonly status: PosterStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastExportedAt?: string;
  /** Small preview rendered at save time; purely a thumbnail, never the poster itself. */
  readonly thumbnailUri?: string;
}

export interface PosterSummary {
  readonly id: string;
  readonly title: string;
  readonly templateId: string;
  readonly officeId: string;
  readonly eventType: string;
  readonly status: PosterStatus;
  readonly updatedAt: string;
  readonly thumbnailUri?: string;
}

export function toSummary(document: PosterDocument): PosterSummary {
  return {
    id: document.id,
    title: document.title || document.eventDetails.title || 'Untitled poster',
    templateId: document.templateId,
    officeId: document.localOfficeId,
    eventType: document.eventType,
    status: document.status,
    updatedAt: document.updatedAt,
    thumbnailUri: document.thumbnailUri,
  };
}
