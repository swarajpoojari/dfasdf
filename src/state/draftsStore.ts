import { create } from 'zustand';

import type { PosterSummary } from '@/domain/types/document';
import { posterRepository } from '@/storage/posterRepository';

interface DraftsState {
  readonly posters: readonly PosterSummary[];
  readonly loading: boolean;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  latestDraft: () => PosterSummary | undefined;
}

export const useDraftsStore = create<DraftsState>((set, get) => ({
  posters: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    const posters = await posterRepository.list();
    set({ posters, loading: false });
  },

  remove: async (id) => {
    await posterRepository.remove(id);
    set({ posters: get().posters.filter((poster) => poster.id !== id) });
  },

  latestDraft: () => get().posters.find((poster) => poster.status === 'draft'),
}));
