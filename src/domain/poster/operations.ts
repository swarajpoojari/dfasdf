import { checkOperation, isProtected } from '@/domain/assets/policy';
import type { AssetOperation, OfficialAsset } from '@/domain/types/assets';
import { GRID_STEP } from '@/domain/types/canvas';
import { assetAspectRatio } from '@/domain/types/assets';
import { clamp } from '@/domain/types/common';
import type { PosterDocument } from '@/domain/types/document';
import type { PosterElement, TextStyle } from '@/domain/types/elements';
import { isAssetBacked } from '@/domain/types/elements';
import { err, ok, type Result } from '@/utils/result';
import { createId } from '@/utils/id';
import { touch } from './document';

export interface OperationContext {
  readonly lookupAsset: (id: string) => OfficialAsset | undefined;
  readonly snapToGrid?: boolean;
}

function replaceElement(
  document: PosterDocument,
  elementId: string,
  update: (element: PosterElement) => PosterElement,
): PosterDocument {
  return touch(document, {
    elements: document.elements.map((element) => (element.id === elementId ? update(element) : element)),
  });
}

function assetOf(element: PosterElement, ctx: OperationContext): OfficialAsset | undefined {
  return isAssetBacked(element) && element.assetId ? ctx.lookupAsset(element.assetId) : undefined;
}

/**
 * Gate for every element mutation.
 *
 * A locked element cannot be edited at all. An element backed by a protected
 * official asset can be moved and scaled proportionally, but the asset policy
 * decides everything else — and it says no to stretching, recolouring,
 * mirroring, stylising, enhancing and regenerating.
 */
function authorise(
  element: PosterElement,
  operation: AssetOperation,
  ctx: OperationContext,
  extra: { cropMode?: string; opacity?: number } = {},
): Result<true, string> {
  const asset = assetOf(element, ctx);
  if (!asset) {
    if (element.locked && operation !== 'position') {
      return err(`"${element.name}" is part of the official layout and cannot be changed here.`);
    }
    return ok(true);
  }
  return checkOperation(asset, operation, extra as never);
}

export function moveElement(
  document: PosterDocument,
  elementId: string,
  delta: { dx: number; dy: number },
  ctx: OperationContext,
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');
  if (element.locked) return err(`"${element.name}" is locked and cannot be moved.`);

  const allowed = authorise(element, 'position', ctx);
  if (!allowed.ok) return allowed;

  const snap = (value: number): number =>
    ctx.snapToGrid ? Math.round(value / GRID_STEP) * GRID_STEP : Math.round(value);

  return ok(
    replaceElement(document, elementId, (current) => ({
      ...current,
      frame: {
        ...current.frame,
        x: snap(current.frame.x + delta.dx),
        y: snap(current.frame.y + delta.dy),
      },
    })),
  );
}

/**
 * Resizing.
 *
 * For an element backed by a protected asset the *only* permitted change is a
 * uniform scale, so the requested width and height are reconciled against the
 * asset's true aspect ratio before anything is written. There is no code path
 * that can produce a stretched official logo.
 */
export function resizeElement(
  document: PosterDocument,
  elementId: string,
  size: { width: number; height: number },
  ctx: OperationContext,
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');
  if (element.locked) return err(`"${element.name}" is locked and cannot be resized.`);

  const asset = assetOf(element, ctx);
  const uniform = authorise(element, 'uniformScale', ctx);
  if (!uniform.ok) return uniform;

  let width = Math.max(24, size.width);
  let height = Math.max(24, size.height);

  if (asset && isProtected(asset)) {
    const ratio = assetAspectRatio(asset);
    // Honour whichever dimension the user dragged furthest, then derive the other.
    const byWidth = Math.abs(width - element.frame.width) >= Math.abs(height - element.frame.height);
    if (byWidth) height = width / ratio;
    else width = height * ratio;
  }

  return ok(
    replaceElement(document, elementId, (current) => ({
      ...current,
      frame: { ...current.frame, width: Math.round(width), height: Math.round(height) },
    })),
  );
}

export function setElementOpacity(
  document: PosterDocument,
  elementId: string,
  opacity: number,
  ctx: OperationContext,
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');

  const value = clamp(opacity, 0, 1);
  const allowed = authorise(element, 'opacity', ctx, { opacity: value });
  if (!allowed.ok) return allowed;

  return ok(replaceElement(document, elementId, (current) => ({ ...current, opacity: value })));
}

/**
 * Replacing an official image.
 *
 * The replacement must itself come from the approved asset library. There is no
 * "generate an alternative" path, and no automatic substitution: the user picks
 * an approved asset, or the frame stays empty and validation blocks export.
 */
export function replaceAsset(
  document: PosterDocument,
  elementId: string,
  replacement: OfficialAsset,
  ctx: OperationContext,
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');
  if (!isAssetBacked(element)) return err(`"${element.name}" does not hold an image.`);

  if (!replacement.approved) {
    return err('Approved asset required. Please choose an image approved by the association.');
  }

  const current = assetOf(element, ctx);
  if (current) {
    const allowed = checkOperation(current, 'replaceFromApprovedLibrary');
    if (!allowed.ok) return allowed;
  }

  return ok(
    replaceElement(document, elementId, (target) => ({ ...target, assetId: replacement.id }) as PosterElement),
  );
}

export function setElementVisibility(
  document: PosterDocument,
  elementId: string,
  visible: boolean,
): PosterDocument {
  return replaceElement(document, elementId, (element) => ({ ...element, visible }));
}

export function setElementLock(document: PosterDocument, elementId: string, locked: boolean): PosterDocument {
  return replaceElement(document, elementId, (element) => ({ ...element, locked }));
}

export function updateTextStyle(
  document: PosterDocument,
  elementId: string,
  patch: Partial<TextStyle>,
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');
  if (element.type !== 'TEXT') return err(`"${element.name}" is not a text item.`);

  return ok(
    replaceElement(document, elementId, (current) =>
      current.type === 'TEXT' ? { ...current, style: { ...current.style, ...patch } } : current,
    ),
  );
}

export function setLiteralText(
  document: PosterDocument,
  elementId: string,
  text: string,
): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element || element.type !== 'TEXT') return err('That text item is no longer part of this poster.');
  if (element.binding) {
    return err(
      `"${element.name}" is filled in from the event details. Edit it on the Event Details screen so every template stays in step.`,
    );
  }
  return ok(
    replaceElement(document, elementId, (current) =>
      current.type === 'TEXT' ? { ...current, text } : current,
    ),
  );
}

export function duplicateElement(document: PosterDocument, elementId: string): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');

  const highestZ = document.elements.reduce((highest, e) => Math.max(highest, e.zIndex), 0);
  const copy: PosterElement = {
    ...element,
    id: createId('el'),
    name: `${element.name} (copy)`,
    zIndex: highestZ + 1,
    frame: { ...element.frame, x: element.frame.x + 24, y: element.frame.y + 24 },
    // A duplicate never inherits a flow group — it would fight the original.
    flow: { ...element.flow, group: undefined, pinned: true },
  };

  return ok(touch(document, { elements: [...document.elements, copy] }));
}

export function removeElement(document: PosterDocument, elementId: string): Result<PosterDocument, string> {
  const element = document.elements.find((candidate) => candidate.id === elementId);
  if (!element) return err('That item is no longer part of this poster.');
  if (element.locked) {
    return err(`"${element.name}" is part of the official layout and cannot be removed. You can hide it instead.`);
  }
  return ok(touch(document, { elements: document.elements.filter((e) => e.id !== elementId) }));
}
