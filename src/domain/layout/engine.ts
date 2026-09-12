import type { AssetSlot } from '@/domain/assets/slots';
import { slotMissingMessage } from '@/domain/assets/slots';
import { isProtected } from '@/domain/assets/policy';
import { resolveTextBinding } from '@/domain/poster/binding';
import { SAFE_MARGIN } from '@/domain/types/canvas';
import {
  centerIn,
  fitContain,
  intersectionArea,
  rectBottom,
  rectContains,
  type Rect,
} from '@/domain/types/common';
import type { EventDetails } from '@/domain/types/content';
import type {
  ListElement,
  PosterElement,
  TextElement,
  TextStyle,
} from '@/domain/types/elements';
import { isAssetBacked, isListElement } from '@/domain/types/elements';
import type { OfficialAsset } from '@/domain/types/assets';
import type { LocalOffice } from '@/domain/types/office';
import type { PosterTemplate } from '@/domain/types/template';
import type { PosterDocument } from '@/domain/types/document';
import { fontFamily, fontFileFor, resolveFamilyForScript } from '@/theme/fonts';
import { dominantScript } from './script';
import { fitText } from './autofit';
import {
  EMPTY_CONTENT,
  measureFelicitations,
  measureGuests,
  measureProgramme,
  scaleStyle,
  type MeasuredContent,
  type MeasuredLine,
} from './blocks';
import type { TextMeasurer } from './textMeasure';
import type {
  ElementLayout,
  LayoutIssue,
  PosterLayout,
  RenderNode,
  ResolvedTextStyle,
} from './types';

export interface LayoutInput {
  readonly document: PosterDocument;
  readonly template: PosterTemplate;
  readonly office: LocalOffice;
  readonly measurer: TextMeasurer;
  readonly lookupAsset: (id: string) => OfficialAsset | undefined;
  readonly lookupSlot: (id: string) => AssetSlot | undefined;
  /**
   * `edit` draws placeholders for unfilled asset slots and empty text fields.
   * `export` never does — export is blocked by validation before it gets here.
   */
  readonly mode?: 'edit' | 'export';
}

/**
 * Successive compression attempts, applied only when a group overflows.
 *
 * The floor of 0.70 is not arbitrary: combined with each element's own
 * `autoFit.minFontSize`, it is the point past which a name on a community
 * poster stops being readable from across a hall. Beyond it the engine reports
 * an overflow instead of shrinking further.
 */
const FONT_SCALES = [1, 0.97, 0.94, 0.9, 0.86, 0.82, 0.78, 0.74, 0.7] as const;
const GAP_SCALES = [1, 0.94, 0.88, 0.8, 0.72, 0.64, 0.58, 0.52, 0.46] as const;

/** Overlap smaller than this fraction of the smaller element is ignored. */
const OVERLAP_TOLERANCE = 0.02;

interface Measured {
  readonly element: PosterElement;
  readonly content: MeasuredContent;
  readonly fontScale: number;
  readonly fits: boolean;
}

export function layoutPoster(input: LayoutInput): PosterLayout {
  const { document, template, office, measurer, lookupAsset, lookupSlot } = input;
  const mode = input.mode ?? 'edit';
  const details = document.eventDetails;
  const canvas = template.canvas;

  const elements = document.elements.filter((element) => element.visible);
  const issues: LayoutIssue[] = [];

  const frames = reflow(elements, { details, office, measurer, canvas, issues });

  const nodes: RenderNode[] = [];
  const layouts: ElementLayout[] = [];
  const requiredAssetIds = new Set<string>();

  nodes.push(...backgroundNodes(template));

  const painted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const element of painted) {
    const placed = frames.get(element.id);
    if (!placed) continue;

    layouts.push({
      elementId: element.id,
      frame: placed.frame,
      contentHeight: placed.contentHeight,
      grew: placed.frame.height > element.frame.height + 0.5,
      shrank: placed.frame.height < element.frame.height - 0.5,
      fontScale: placed.fontScale,
    });

    if (isAssetBacked(element)) {
      const assetId = element.assetId;
      const asset = assetId ? lookupAsset(assetId) : undefined;
      if (asset && asset.approved) {
        requiredAssetIds.add(asset.id);
        nodes.push({
          kind: 'image',
          elementId: element.id,
          assetId: asset.id,
          rect: imageRect(asset, element.fit, element.cropMode, placed.frame),
          cropMode: element.cropMode,
          opacity: element.opacity,
        });
      } else {
        const slot = element.slotId ? lookupSlot(element.slotId) : undefined;
        const message = slot
          ? slotMissingMessage(slot)
          : 'Approved asset required. No approved image has been chosen for this frame.';
        if (element.required !== false) {
          issues.push({
            code: 'MISSING_ASSET',
            elementId: element.id,
            elementName: element.name,
            message,
            autoFixable: false,
            detail: asset && !asset.approved ? `"${asset.name}" is not approved.` : undefined,
          });
        }
        if (mode === 'edit') {
          nodes.push({
            kind: 'placeholder',
            elementId: element.id,
            rect: placed.frame,
            message: 'APPROVED ASSET REQUIRED',
            slotLabel: slot?.label ?? element.name,
          });
        }
      }
      continue;
    }

    switch (element.type) {
      case 'SHAPE':
        nodes.push({
          kind: 'rect',
          elementId: element.id,
          rect: placed.frame,
          fill: element.fill,
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          cornerRadius: element.shape === 'roundedRect' ? element.cornerRadius : 0,
          ellipse: element.shape === 'ellipse',
          opacity: element.opacity,
        });
        break;

      case 'LINE':
        nodes.push({
          kind: 'line',
          elementId: element.id,
          from: { x: placed.frame.x, y: placed.frame.y + placed.frame.height / 2 },
          to: { x: placed.frame.x + placed.frame.width, y: placed.frame.y + placed.frame.height / 2 },
          color: element.color,
          thickness: element.thickness,
          ornament: element.ornament ?? 'none',
          opacity: element.opacity,
        });
        break;

      case 'QR_CODE':
        nodes.push({
          kind: 'qr',
          elementId: element.id,
          rect: placed.frame,
          value: element.value,
          foreground: element.foreground,
          background: element.background,
          opacity: element.opacity,
        });
        break;

      default:
        nodes.push(...textNodes(element, placed.frame, placed.content, element.opacity));
        break;
    }
  }

  issues.push(...geometryIssues(elements, frames, canvas));

  return {
    canvas,
    backgroundColor: template.background.color,
    nodes,
    elements: layouts,
    issues,
    requiredAssetIds: [...requiredAssetIds],
  };
}

/* -------------------------------------------------------------------------- */
/* Measurement                                                                */
/* -------------------------------------------------------------------------- */

interface MeasureContext {
  readonly details: EventDetails;
  readonly office: LocalOffice;
  readonly measurer: TextMeasurer;
}

export function textForElement(element: TextElement, ctx: MeasureContext): string {
  const bound = element.binding ? resolveTextBinding(element.binding, ctx) : undefined;
  const text = (element.binding ? bound : element.text) ?? '';
  return element.style.uppercase ? text.toUpperCase() : text;
}

function measureElement(element: PosterElement, ctx: MeasureContext, fontScale: number): Measured {
  if (element.type === 'TEXT') {
    const text = textForElement(element, ctx);
    if (!text) {
      return { element, content: EMPTY_CONTENT, fontScale, fits: true };
    }
    const style = scaleStyle(
      element.style,
      fontScale,
      element.autoFit.minFontSize,
      element.autoFit.maxFontSize,
    );
    const maxHeight = element.autoFit.maxHeight ?? element.frame.height;
    const fitted = fitText(
      text,
      { width: element.frame.width, height: Math.max(maxHeight, element.frame.height) },
      style,
      element.autoFit,
      ctx.measurer,
      element.maxLines,
    );
    const lines: MeasuredLine[] = fitted.lines.map((line, index) => ({
      text: line,
      style: { ...style, fontSize: fitted.fontSize },
      fontSize: fitted.fontSize,
      top: index * fitted.lineHeight,
      lineHeight: fitted.lineHeight,
      indent: 0,
      boxWidth: element.frame.width,
      align: style.align,
    }));
    return {
      element,
      content: { lines, height: fitted.height, truncated: fitted.truncated },
      fontScale,
      fits: fitted.fits,
    };
  }

  if (isListElement(element)) {
    const content = measureList(element, ctx, fontScale);
    return { element, content, fontScale, fits: true };
  }

  return { element, content: EMPTY_CONTENT, fontScale, fits: true };
}

function measureList(element: ListElement, ctx: MeasureContext, fontScale: number): MeasuredContent {
  switch (element.type) {
    case 'PROGRAMME_LIST':
      return measureProgramme(element, ctx.details.programme, ctx.measurer, fontScale);
    case 'GUEST_LIST':
      return measureGuests(element, ctx.details.guests, ctx.measurer, fontScale);
    case 'FELICITATION_LIST':
      return measureFelicitations(element, ctx.details.felicitations, ctx.measurer, fontScale);
    default:
      return EMPTY_CONTENT;
  }
}

/* -------------------------------------------------------------------------- */
/* Re-flow                                                                    */
/* -------------------------------------------------------------------------- */

interface PlacedElement {
  readonly frame: Rect;
  readonly content: MeasuredContent;
  readonly contentHeight: number;
  readonly fontScale: number;
}

interface ReflowContext extends MeasureContext {
  readonly canvas: { width: number; height: number };
  readonly issues: LayoutIssue[];
}

/**
 * Vertical re-flow.
 *
 * Elements that share a flow group are stacked in authored order. When one of
 * them needs more room than the template gave it — a felicitation entry with
 * four bullet points, a long Kannada name — it grows, and everything after it in
 * the group moves down by exactly that much.
 *
 * If the group then runs past the room available to it, the engine makes
 * concessions in the same order a designer would: tighten the gaps, then reduce
 * type size within the template's stated limits. Only when every permitted
 * concession has been used does it report an overflow — content is never
 * clipped away quietly.
 */
function reflow(
  elements: readonly PosterElement[],
  ctx: ReflowContext,
): ReadonlyMap<string, PlacedElement> {
  const placed = new Map<string, PlacedElement>();

  const groups = new Map<string, PosterElement[]>();
  const ungrouped: PosterElement[] = [];
  for (const element of elements) {
    const group = element.flow.group;
    if (group) {
      const bucket = groups.get(group) ?? [];
      bucket.push(element);
      groups.set(group, bucket);
    } else {
      ungrouped.push(element);
    }
  }

  for (const element of ungrouped) {
    const measured = measureElement(element, ctx, 1);
    placed.set(element.id, {
      frame: growFrame(element, measured.content.height),
      content: measured.content,
      contentHeight: measured.content.height,
      fontScale: 1,
    });
    recordContentIssues(element, measured, ctx.issues);
  }

  for (const [groupId, members] of groups) {
    const ordered = [...members].sort((a, b) => a.frame.y - b.frame.y);
    const limit = groupLimit(ordered, elements, ctx.canvas.height);

    let chosen:
      | { placements: Map<string, PlacedElement>; bottom: number; requiredBottom: number; pass: number }
      | undefined;

    for (let pass = 0; pass < FONT_SCALES.length; pass += 1) {
      const attempt = flowGroup(ordered, ctx, FONT_SCALES[pass] ?? 1, GAP_SCALES[pass] ?? 1, limit);
      chosen = { ...attempt, pass };
      if (attempt.requiredBottom <= limit) break;
    }

    if (!chosen) continue;

    for (const [id, placement] of chosen.placements) placed.set(id, placement);

    if (chosen.requiredBottom > limit + 0.5) {
      const overflowing = ordered[ordered.length - 1];
      if (overflowing) {
        ctx.issues.push({
          code: 'TEXT_OVERFLOW',
          elementId: overflowing.id,
          elementName: overflowing.name,
          message: `The "${overflowing.name}" section is longer than the space this template reserves for it.`,
          autoFixable: true,
          detail: `About ${Math.round(chosen.requiredBottom - limit)} design units too tall in the "${groupId}" section.`,
        });
      }
    }

    for (const element of ordered) {
      const measured = measureElement(element, ctx, FONT_SCALES[chosen.pass] ?? 1);
      recordContentIssues(element, measured, ctx.issues);
    }
  }

  return placed;
}

/**
 * One placement attempt at a given compression level.
 *
 * Two cursors are tracked: the frames actually written are clamped to `limit`
 * so nothing is ever positioned off the poster, while `requiredBottom` records
 * where the content *wanted* to end. The caller compares the second against the
 * limit, so clamping a frame can never hide an overflow.
 */
function flowGroup(
  ordered: readonly PosterElement[],
  ctx: MeasureContext,
  fontScale: number,
  gapScale: number,
  limit: number,
): { placements: Map<string, PlacedElement>; bottom: number; requiredBottom: number } {
  const placements = new Map<string, PlacedElement>();
  const start = ordered[0]?.frame.y ?? 0;
  let cursor = start;
  let wantedCursor = start;
  let bottom = start;
  let requiredBottom = start;

  for (const element of ordered) {
    const measured = measureElement(element, ctx, fontScale);
    const wanted = growFrame(element, measured.content.height);

    const y = element.flow.pinned ? element.frame.y : cursor;
    const wantedY = element.flow.pinned ? element.frame.y : wantedCursor;

    const height = Math.max(0, Math.min(wanted.height, limit - y));
    const frame = { ...wanted, y, height };

    placements.set(element.id, {
      frame,
      content: measured.content,
      contentHeight: measured.content.height,
      fontScale,
    });

    const gap = element.flow.gapBelow * gapScale;
    cursor = y + height + gap;
    wantedCursor = wantedY + wanted.height + gap;
    bottom = y + height;
    requiredBottom = wantedY + wanted.height;
  }

  return { placements, bottom, requiredBottom };
}

/** Grows or shrinks an element's authored frame to match its content. */
function growFrame(element: PosterElement, contentHeight: number): Rect {
  const { frame, flow } = element;
  if (contentHeight <= 0) return { ...frame };

  let height = frame.height;
  if (flow.canGrow && contentHeight > frame.height) {
    const ceiling = maxHeightOf(element) ?? Number.POSITIVE_INFINITY;
    height = Math.min(contentHeight, ceiling);
  } else if (flow.canShrink && contentHeight < frame.height) {
    height = contentHeight;
  }
  return { ...frame, height };
}

function maxHeightOf(element: PosterElement): number | undefined {
  if (element.type === 'TEXT') return element.autoFit.maxHeight;
  if (isListElement(element)) return element.autoFit.maxHeight;
  return undefined;
}

/**
 * How far down the page a group may extend: the top of whatever the template
 * authored below it, or the safe bottom margin of the canvas.
 *
 * Groups never push each other around — a long felicitation list must fit the
 * room the template reserved for it, by compressing within the permitted
 * limits, rather than shoving the footer off the poster.
 */
function groupLimit(
  ordered: readonly PosterElement[],
  all: readonly PosterElement[],
  canvasHeight: number,
): number {
  const ids = new Set(ordered.map((element) => element.id));
  const authoredBottom = ordered.reduce((lowest, element) => Math.max(lowest, rectBottom(element.frame)), 0);

  const blocker = all
    .filter((element) => !ids.has(element.id) && element.frame.y >= authoredBottom - 1)
    .sort((a, b) => a.frame.y - b.frame.y)[0];

  const ceiling = canvasHeight - SAFE_MARGIN;
  if (!blocker) return ceiling;
  return Math.min(ceiling, blocker.frame.y - blocker.flow.gapBelow * 0.5);
}

function recordContentIssues(element: PosterElement, measured: Measured, issues: LayoutIssue[]): void {
  if (measured.content.truncated) {
    issues.push({
      code: 'TEXT_TRUNCATED',
      elementId: element.id,
      elementName: element.name,
      message: `Some text in "${element.name}" does not fit and would be cut off.`,
      autoFixable: true,
    });
  }
  if (!measured.fits) {
    issues.push({
      code: 'TEXT_OVERFLOW',
      elementId: element.id,
      elementName: element.name,
      message: `"${element.name}" is too long for its box, even at the smallest permitted size.`,
      autoFixable: true,
    });
  }
  if (element.type === 'TEXT' && element.required && measured.content.lines.length === 0) {
    issues.push({
      code: 'EMPTY_REQUIRED_CONTENT',
      elementId: element.id,
      elementName: element.name,
      message: `"${element.name}" is still empty.`,
      autoFixable: false,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Node emission                                                              */
/* -------------------------------------------------------------------------- */

function resolveStyle(style: TextStyle, text: string): ResolvedTextStyle {
  const family = resolveFamilyForScript(style.fontFamily, dominantScript(text));
  return {
    fontFamilyId: family.id,
    fontFile: fontFileFor(family, style.fontWeight),
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
    letterSpacing: style.letterSpacing,
  };
}

function alignedX(line: MeasuredLine, frame: Rect, measuredWidth: number): number {
  const left = frame.x + line.indent;
  switch (line.align) {
    case 'center':
      return left + (line.boxWidth - measuredWidth) / 2;
    case 'right':
      return left + (line.boxWidth - measuredWidth);
    case 'left':
    default:
      return left;
  }
}

function textNodes(
  element: PosterElement,
  frame: Rect,
  content: MeasuredContent,
  opacity: number,
): readonly RenderNode[] {
  const nodes: RenderNode[] = [];
  for (const line of content.lines) {
    if (!line.text) continue;
    const style = resolveStyle(line.style, line.text);
    const metrics = fontFamily(style.fontFamilyId).metrics;
    const ascent = style.fontSize * metrics.contentHeight * 0.78;
    // Width is recomputed from the resolved style so alignment matches paint.
    const width = approximateWidth(line, style);
    nodes.push({
      kind: 'text',
      elementId: element.id,
      x: alignedX(line, frame, width),
      baseline: frame.y + line.top + (line.lineHeight - style.fontSize * metrics.contentHeight) / 2 + ascent,
      width,
      text: line.text,
      align: line.align,
      style,
      opacity,
    });
  }
  return nodes;
}

/**
 * Alignment needs a width at node-emission time. Rather than plumbing the
 * measurer through, lines keep the width they were wrapped at; the painter
 * re-measures with real font metrics and re-aligns within `boxWidth`, so this
 * value is only a hint for editors and tests.
 */
function approximateWidth(line: MeasuredLine, style: ResolvedTextStyle): number {
  const metrics = fontFamily(style.fontFamilyId).metrics;
  return Math.min(
    line.boxWidth,
    line.text.length * metrics.avgAdvance * style.fontSize + Math.max(0, line.text.length - 1) * style.letterSpacing,
  );
}

function imageRect(
  asset: OfficialAsset,
  fit: 'contain' | 'cover',
  cropMode: string,
  frame: Rect,
): Rect {
  // An official asset is never cropped unless an approved crop mode was chosen,
  // and never stretched: `cover` silently degrades to `contain` for protected
  // assets rather than filling the frame by distorting or cutting the image.
  const mustContain = fit === 'contain' || (isProtected(asset) && cropMode === 'none');
  if (mustContain) {
    return centerIn(fitContain({ width: asset.width, height: asset.height }, frame), frame);
  }
  const scale = Math.max(frame.width / asset.width, frame.height / asset.height);
  return centerIn({ width: asset.width * scale, height: asset.height * scale }, frame);
}

function backgroundNodes(template: PosterTemplate): readonly RenderNode[] {
  const { canvas, background } = template;
  const nodes: RenderNode[] = [
    {
      kind: 'rect',
      elementId: '__background',
      rect: { x: 0, y: 0, width: canvas.width, height: canvas.height },
      fill: background.color,
      strokeWidth: 0,
      cornerRadius: 0,
      opacity: 1,
    },
  ];

  const border = background.border;
  if (border) {
    nodes.push({
      kind: 'rect',
      elementId: '__border',
      rect: {
        x: border.inset,
        y: border.inset,
        width: canvas.width - border.inset * 2,
        height: canvas.height - border.inset * 2,
      },
      stroke: border.color,
      strokeWidth: border.width,
      cornerRadius: 0,
      opacity: 1,
    });
    if (border.innerColor && border.innerWidth && border.innerInset) {
      nodes.push({
        kind: 'rect',
        elementId: '__border-inner',
        rect: {
          x: border.innerInset,
          y: border.innerInset,
          width: canvas.width - border.innerInset * 2,
          height: canvas.height - border.innerInset * 2,
        },
        stroke: border.innerColor,
        strokeWidth: border.innerWidth,
        cornerRadius: 0,
        opacity: 1,
      });
    }
  }

  return nodes;
}

/* -------------------------------------------------------------------------- */
/* Geometry checks                                                            */
/* -------------------------------------------------------------------------- */

const SOLID_TYPES = new Set(['TEXT', 'IMAGE', 'OFFICIAL_LOGO', 'PROGRAMME_LIST', 'GUEST_LIST', 'FELICITATION_LIST']);

function geometryIssues(
  elements: readonly PosterElement[],
  frames: ReadonlyMap<string, PlacedElement>,
  canvas: { width: number; height: number },
): readonly LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const canvasRect: Rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  const safeRect: Rect = {
    x: SAFE_MARGIN,
    y: SAFE_MARGIN,
    width: canvas.width - SAFE_MARGIN * 2,
    height: canvas.height - SAFE_MARGIN * 2,
  };

  const solid: { element: PosterElement; frame: Rect }[] = [];

  for (const element of elements) {
    const placed = frames.get(element.id);
    if (!placed) continue;

    if (!rectContains(canvasRect, placed.frame)) {
      issues.push({
        code: 'ELEMENT_OUTSIDE_CANVAS',
        elementId: element.id,
        elementName: element.name,
        message: `"${element.name}" extends past the edge of the poster and would be cut off.`,
        autoFixable: true,
      });
    } else if (!rectContains(safeRect, placed.frame) && SOLID_TYPES.has(element.type)) {
      issues.push({
        code: 'OUTSIDE_SAFE_MARGIN',
        elementId: element.id,
        elementName: element.name,
        message: `"${element.name}" sits very close to the edge of the poster.`,
        autoFixable: true,
      });
    }

    if (SOLID_TYPES.has(element.type)) {
      solid.push({ element, frame: placed.frame });
    }
  }

  for (let i = 0; i < solid.length; i += 1) {
    for (let j = i + 1; j < solid.length; j += 1) {
      const a = solid[i];
      const b = solid[j];
      if (!a || !b) continue;
      const area = intersectionArea(a.frame, b.frame);
      if (area <= 0) continue;
      const smallest = Math.min(a.frame.width * a.frame.height, b.frame.width * b.frame.height);
      if (smallest <= 0) continue;
      if (area / smallest > OVERLAP_TOLERANCE) {
        issues.push({
          code: 'ELEMENT_OVERLAP',
          elementId: b.element.id,
          elementName: b.element.name,
          message: `"${a.element.name}" and "${b.element.name}" are overlapping.`,
          autoFixable: true,
          detail: `${Math.round((area / smallest) * 100)}% of "${b.element.name}" is covered.`,
        });
      }
    }
  }

  return issues;
}
