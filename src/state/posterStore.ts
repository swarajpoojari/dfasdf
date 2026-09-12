import { create } from 'zustand';

import { layoutPoster } from '@/domain/layout/engine';
import type { PosterLayout } from '@/domain/layout/types';
import { metricMeasurer, type TextMeasurer } from '@/domain/layout/textMeasure';
import {
  canRedo,
  canUndo,
  commit as commitHistory,
  createHistory,
  redo as redoHistory,
  undo as undoHistory,
  type HistoryState,
} from '@/domain/poster/history';
import { findOffice } from '@/domain/offices/offices';
import { findEventType } from '@/domain/eventTypes/eventTypes';
import { templateRegistry } from '@/domain/templates/registry';
import type { PosterDocument } from '@/domain/types/document';
import type { EventDetails } from '@/domain/types/content';
import { updateDetails } from '@/domain/poster/document';
import { validatePoster } from '@/domain/validation/engine';
import type { AutoFixDescriptor, ValidationReport } from '@/domain/validation/types';
import { applyAutoFix } from '@/domain/validation/autofix';
import { posterRepository } from '@/storage/posterRepository';
import { useLibraryStore } from './libraryStore';
import { toUserMessage } from '@/utils/errors';

interface PosterState {
  readonly history?: HistoryState;
  readonly document?: PosterDocument;
  readonly layout?: PosterLayout;
  readonly report?: ValidationReport;
  readonly selectedElementId?: string;
  readonly measurer: TextMeasurer;
  readonly snapToGrid: boolean;
  readonly previewMode: boolean;
  readonly message?: string;

  open: (document: PosterDocument) => void;
  close: () => void;
  commit: (next: PosterDocument) => void;
  patchDetails: (patch: Partial<EventDetails>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  select: (elementId?: string) => void;
  setSnapToGrid: (value: boolean) => void;
  setPreviewMode: (value: boolean) => void;
  setMeasurer: (measurer: TextMeasurer) => void;
  runAutoFix: (fix: AutoFixDescriptor) => void;
  notify: (message?: string) => void;
  save: () => Promise<void>;
}

/**
 * Editor state.
 *
 * Layout and validation are recomputed on commit, not on every keystroke: the
 * screens debounce their edits before calling `commit`, so a long felicitation
 * description does not re-flow the poster thirty times while it is being typed.
 */
export const usePosterStore = create<PosterState>((set, get) => ({
  measurer: metricMeasurer,
  snapToGrid: true,
  previewMode: false,

  open: (document) => {
    set({ history: createHistory(document), document, selectedElementId: undefined, message: undefined });
    recompute(set, get);
  },

  close: () => set({ history: undefined, document: undefined, layout: undefined, report: undefined }),

  commit: (next) => {
    const history = get().history;
    if (!history) return;
    const updated = commitHistory(history, next);
    set({ history: updated, document: updated.present });
    recompute(set, get);
  },

  patchDetails: (patch) => {
    const document = get().document;
    if (!document) return;
    get().commit(updateDetails(document, patch));
  },

  undo: () => {
    const history = get().history;
    if (!history) return;
    const updated = undoHistory(history);
    set({ history: updated, document: updated.present });
    recompute(set, get);
  },

  redo: () => {
    const history = get().history;
    if (!history) return;
    const updated = redoHistory(history);
    set({ history: updated, document: updated.present });
    recompute(set, get);
  },

  canUndo: () => {
    const history = get().history;
    return history ? canUndo(history) : false;
  },

  canRedo: () => {
    const history = get().history;
    return history ? canRedo(history) : false;
  },

  select: (elementId) => set({ selectedElementId: elementId }),
  setSnapToGrid: (value) => set({ snapToGrid: value }),
  setPreviewMode: (value) => set({ previewMode: value, selectedElementId: undefined }),

  setMeasurer: (measurer) => {
    set({ measurer });
    recompute(set, get);
  },

  runAutoFix: (fix) => {
    const { document, commit } = get();
    const template = document ? templateRegistry.get(document.templateId) : undefined;
    if (!document || !template) return;

    const result = applyAutoFix(document, fix, template.canvas);
    if (result.ok) {
      commit(result.value);
      set({ message: 'Fixed. Please check that the poster still reads the way you want.' });
    } else {
      set({ message: result.error });
    }
  },

  notify: (message) => set({ message }),

  save: async () => {
    const document = get().document;
    if (!document) return;
    try {
      await posterRepository.save(document);
    } catch (error) {
      set({ message: toUserMessage(error).message });
    }
  },
}));

type Setter = (partial: Partial<PosterState>) => void;
type Getter = () => PosterState;

function recompute(set: Setter, get: Getter): void {
  const { document, measurer } = get();
  if (!document) {
    set({ layout: undefined, report: undefined });
    return;
  }

  const template = templateRegistry.get(document.templateId);
  const office = findOffice(document.localOfficeId);
  if (!template || !office) {
    set({ layout: undefined, report: undefined, message: 'This poster refers to a template that is no longer available.' });
    return;
  }

  const { lookupAsset, lookupSlot } = useLibraryStore.getState();

  const layout = layoutPoster({ document, template, office, measurer, lookupAsset, lookupSlot });
  const report = validatePoster({
    document,
    template,
    office,
    eventType: findEventType(document.eventType),
    layout,
    lookupAsset,
    lookupSlot,
  });

  set({ layout, report });
}
