import { SAFE_MARGIN } from '@/domain/types/canvas';
import { clamp } from '@/domain/types/common';
import type { PosterDocument } from '@/domain/types/document';
import type { PosterElement } from '@/domain/types/elements';
import { isListElement } from '@/domain/types/elements';
import { touch } from '@/domain/poster/document';
import { err, ok, type Result } from '@/utils/result';
import type { AutoFixDescriptor } from './types';

/** How far a single "Fix Automatically" is allowed to go. */
const MIN_FONT_FLOOR = 15;
const ROW_GAP_FLOOR = 6;
const RELAX_STEP = 0.85;

/**
 * "Fix Automatically".
 *
 * Each fix makes one bounded, reversible change (it goes onto the undo stack
 * like any other edit) and never touches content. If a section is still too
 * long after the fix, the honest answer is that the words need shortening — the
 * app says so and offers the AI text assistant rather than quietly cutting
 * something off.
 */
export function applyAutoFix(
  document: PosterDocument,
  fix: AutoFixDescriptor,
  canvas: { width: number; height: number },
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === fix.elementId);
  if (!element) return err('That part of the poster is no longer there.');

  switch (fix.kind) {
    case 'relax-section':
      return relaxSection(document, element);
    case 'nudge-into-canvas':
      return nudgeIntoCanvas(document, element, canvas);
    case 'hide-empty-element':
      return ok(
        touch(document, {
          elements: document.elements.map((candidate) =>
            candidate.id === element.id ? { ...candidate, visible: false } : candidate,
          ),
        }),
      );
    default:
      return err('That automatic fix is not available.');
  }
}

function relaxSection(document: PosterDocument, element: PosterElement): Result<PosterDocument, string> {
  if (element.type !== 'TEXT' && !isListElement(element)) {
    return err(`"${element.name}" does not hold text, so there is nothing to tighten.`);
  }

  const currentFloor = element.autoFit.minFontSize;
  const nextFloor = Math.max(MIN_FONT_FLOOR, Math.round(currentFloor * RELAX_STEP));
  const nextRowGap = isListElement(element)
    ? Math.max(ROW_GAP_FLOOR, Math.round(element.rowGap * RELAX_STEP))
    : undefined;

  const currentRowGap = isListElement(element) ? element.rowGap : undefined;
  const atFloor = nextFloor === currentFloor && nextRowGap === currentRowGap;
  if (atFloor) {
    return err(
      `"${element.name}" is already as tight as the template allows. Please shorten the text — the AI assistant can help.`,
    );
  }

  return ok(
    touch(document, {
      elements: document.elements.map((candidate) => {
        if (candidate.id !== element.id) return candidate;
        const relaxed = {
          ...candidate,
          autoFit: {
            ...element.autoFit,
            minFontSize: nextFloor,
            minLineHeightScale: Math.max(0.8, element.autoFit.minLineHeightScale - 0.03),
          },
          flow: { ...candidate.flow, canGrow: true },
        };
        return (nextRowGap !== undefined ? { ...relaxed, rowGap: nextRowGap } : relaxed) as PosterElement;
      }),
    }),
  );
}

function nudgeIntoCanvas(
  document: PosterDocument,
  element: PosterElement,
  canvas: { width: number; height: number },
): Result<PosterDocument, string> {
  const maxX = canvas.width - SAFE_MARGIN - element.frame.width;
  const maxY = canvas.height - SAFE_MARGIN - element.frame.height;
  if (maxX < SAFE_MARGIN || maxY < SAFE_MARGIN) {
    return err(`"${element.name}" is larger than the poster. Please make it smaller first.`);
  }

  return ok(
    touch(document, {
      elements: document.elements.map((candidate) =>
        candidate.id === element.id
          ? {
              ...candidate,
              frame: {
                ...candidate.frame,
                x: clamp(candidate.frame.x, SAFE_MARGIN, maxX),
                y: clamp(candidate.frame.y, SAFE_MARGIN, maxY),
              },
            }
          : candidate,
      ),
    }),
  );
}
