import type { PosterDocument } from '@/domain/types/document';

const DEFAULT_LIMIT = 40;

export interface HistoryState {
  readonly past: readonly PosterDocument[];
  readonly present: PosterDocument;
  readonly future: readonly PosterDocument[];
  readonly limit: number;
}

export function createHistory(document: PosterDocument, limit = DEFAULT_LIMIT): HistoryState {
  return { past: [], present: document, future: [], limit };
}

/**
 * Pushes a new version.
 *
 * Consecutive edits of the same kind (typing into one field, dragging one
 * element) should arrive here already coalesced by the caller — the editor
 * debounces before committing, so undo steps back a whole edit rather than a
 * single keystroke.
 */
export function commit(state: HistoryState, next: PosterDocument): HistoryState {
  if (next === state.present) return state;
  const past = [...state.past, state.present].slice(-state.limit);
  return { ...state, past, present: next, future: [] };
}

export function undo(state: HistoryState): HistoryState {
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return {
    ...state,
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future].slice(0, state.limit),
  };
}

export function redo(state: HistoryState): HistoryState {
  const next = state.future[0];
  if (!next) return state;
  return {
    ...state,
    past: [...state.past, state.present].slice(-state.limit),
    present: next,
    future: state.future.slice(1),
  };
}

export const canUndo = (state: HistoryState): boolean => state.past.length > 0;
export const canRedo = (state: HistoryState): boolean => state.future.length > 0;
