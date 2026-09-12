import type { PosterDocument, PosterSummary } from '@/domain/types/document';
import { toSummary } from '@/domain/types/document';
import { deleteDocument, listDocuments, readDocument, writeDocument } from './storage';

const COLLECTION = 'posters';

export const posterRepository = {
  async save(document: PosterDocument): Promise<void> {
    await writeDocument(COLLECTION, document.id, document);
  },

  async load(id: string): Promise<PosterDocument | undefined> {
    return readDocument<PosterDocument>(COLLECTION, id);
  },

  async remove(id: string): Promise<void> {
    await deleteDocument(COLLECTION, id);
  },

  async list(): Promise<readonly PosterSummary[]> {
    const documents = await listDocuments<PosterDocument>(COLLECTION);
    return documents
      .map(toSummary)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  /** The poster the Home screen offers to continue. */
  async latestDraft(): Promise<PosterSummary | undefined> {
    const all = await this.list();
    return all.find((poster) => poster.status === 'draft');
  },
};
