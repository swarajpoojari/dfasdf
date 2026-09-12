import {
  ClipOp,
  PaintStyle,
  Skia,
  type SkCanvas,
  type SkFont,
  type SkPaint,
} from '@shopify/react-native-skia';

import type { PosterLayout, RenderNode, TextNode } from '@/domain/layout/types';
import { POSTER_COLORS } from '@/domain/templates/tokens';
import type { PosterResources } from './resources';

/**
 * THE PAINTER
 *
 * One function draws a poster, and it is used by both the on-screen editor and
 * the export pipeline. The editor draws it into a picture scaled to the device;
 * export draws it into an offscreen surface at full resolution. Because the
 * node list is identical and the only difference is a single `canvas.scale`,
 * what the user approves on screen is what lands in the exported file.
 *
 * Nothing here interprets content: no fallbacks, no "if the logo is missing
 * substitute something". Missing assets arrive as placeholder nodes.
 */
export interface PaintOptions {
  /** Multiplier from design units to output pixels. */
  readonly scale?: number;
  /** Draws safe-margin and grid guides; editor only. */
  readonly guides?: boolean;
}

const fontCache = new Map<string, SkFont>();

export function paintPoster(
  canvas: SkCanvas,
  layout: PosterLayout,
  resources: PosterResources,
  options: PaintOptions = {},
): void {
  const scale = options.scale ?? 1;

  canvas.save();
  canvas.scale(scale, scale);
  canvas.drawColor(Skia.Color(layout.backgroundColor));

  for (const node of layout.nodes) {
    drawNode(canvas, node, resources);
  }

  if (options.guides) drawGuides(canvas, layout);
  canvas.restore();
}

function drawNode(canvas: SkCanvas, node: RenderNode, resources: PosterResources): void {
  switch (node.kind) {
    case 'rect':
      drawRect(canvas, node);
      break;
    case 'line':
      drawLine(canvas, node);
      break;
    case 'image':
      drawImage(canvas, node, resources);
      break;
    case 'placeholder':
      drawPlaceholder(canvas, node, resources);
      break;
    case 'text':
      drawText(canvas, node, resources);
      break;
    case 'qr':
      drawQrFrame(canvas, node);
      break;
    default:
      break;
  }
}

/* -------------------------------------------------------------------------- */

function fill(color: string, opacity: number): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Fill);
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(opacity);
  return paint;
}

function stroke(color: string, width: number, opacity: number): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(opacity);
  return paint;
}

function drawRect(canvas: SkCanvas, node: Extract<RenderNode, { kind: 'rect' }>): void {
  const rect = Skia.XYWHRect(node.rect.x, node.rect.y, node.rect.width, node.rect.height);

  if (node.fill) {
    const paint = fill(node.fill, node.opacity);
    if (node.ellipse) canvas.drawOval(rect, paint);
    else if (node.cornerRadius > 0) canvas.drawRRect(Skia.RRectXY(rect, node.cornerRadius, node.cornerRadius), paint);
    else canvas.drawRect(rect, paint);
  }

  if (node.stroke && node.strokeWidth > 0) {
    const paint = stroke(node.stroke, node.strokeWidth, node.opacity);
    if (node.ellipse) canvas.drawOval(rect, paint);
    else if (node.cornerRadius > 0) canvas.drawRRect(Skia.RRectXY(rect, node.cornerRadius, node.cornerRadius), paint);
    else canvas.drawRect(rect, paint);
  }
}

function drawLine(canvas: SkCanvas, node: Extract<RenderNode, { kind: 'line' }>): void {
  const paint = stroke(node.color, node.thickness, node.opacity);

  if (node.ornament === 'diamond') {
    // A centred diamond with a rule either side — the divider used on the
    // association's printed posters.
    const centreX = (node.from.x + node.to.x) / 2;
    const y = node.from.y;
    const size = node.thickness * 4;
    canvas.drawLine(node.from.x, y, centreX - size * 1.6, y, paint);
    canvas.drawLine(centreX + size * 1.6, y, node.to.x, y, paint);

    const diamond = Skia.Path.Make();
    diamond.moveTo(centreX, y - size);
    diamond.lineTo(centreX + size, y);
    diamond.lineTo(centreX, y + size);
    diamond.lineTo(centreX - size, y);
    diamond.close();
    canvas.drawPath(diamond, fill(node.color, node.opacity));
    return;
  }

  if (node.ornament === 'dots') {
    const count = 9;
    const step = (node.to.x - node.from.x) / (count - 1);
    for (let i = 0; i < count; i += 1) {
      canvas.drawOval(
        Skia.XYWHRect(node.from.x + step * i - node.thickness, node.from.y - node.thickness, node.thickness * 2, node.thickness * 2),
        fill(node.color, node.opacity),
      );
    }
    return;
  }

  canvas.drawLine(node.from.x, node.from.y, node.to.x, node.to.y, paint);
}

function drawImage(
  canvas: SkCanvas,
  node: Extract<RenderNode, { kind: 'image' }>,
  resources: PosterResources,
): void {
  const image = resources.image(node.assetId);
  if (!image) return; // Validation blocks export long before this can happen.

  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setAlphaf(node.opacity);

  const source = Skia.XYWHRect(0, 0, image.width(), image.height());
  const destination = Skia.XYWHRect(node.rect.x, node.rect.y, node.rect.width, node.rect.height);

  const needsClip = node.cropMode === 'centerCircle' || node.cropMode === 'centerSquare';
  if (needsClip) {
    canvas.save();
    if (node.cropMode === 'centerCircle') {
      const diameter = Math.min(node.rect.width, node.rect.height);
      const circle = Skia.XYWHRect(
        node.rect.x + (node.rect.width - diameter) / 2,
        node.rect.y + (node.rect.height - diameter) / 2,
        diameter,
        diameter,
      );
      canvas.clipRRect(Skia.RRectXY(circle, diameter / 2, diameter / 2), ClipOp.Intersect, true);
    } else {
      canvas.clipRect(destination, ClipOp.Intersect, true);
    }
  }

  canvas.drawImageRect(image, source, destination, paint);
  if (needsClip) canvas.restore();
}

/**
 * The unmistakable "this is not the real thing" box.
 *
 * When an official asset has not been installed the app draws this rather than
 * anything that could be mistaken for a logo or a likeness. Export is blocked
 * while one of these is on the poster.
 */
function drawPlaceholder(
  canvas: SkCanvas,
  node: Extract<RenderNode, { kind: 'placeholder' }>,
  resources: PosterResources,
): void {
  const { rect } = node;
  const box = Skia.XYWHRect(rect.x, rect.y, rect.width, rect.height);

  canvas.drawRect(box, fill('#F2E7D2', 1));

  const hatch = stroke('#C9B58B', 2, 1);
  canvas.save();
  canvas.clipRect(box, ClipOp.Intersect, true);
  const step = 26;
  for (let offset = -rect.height; offset < rect.width; offset += step) {
    canvas.drawLine(rect.x + offset, rect.y, rect.x + offset + rect.height, rect.y + rect.height, hatch);
  }
  canvas.restore();

  canvas.drawRect(box, stroke(POSTER_COLORS.maroon, 3, 1));

  const font = resolveFont(resources, '', Math.min(22, rect.width / 12));
  const paint = fill(POSTER_COLORS.maroon, 1);
  const width = font.getTextWidth(node.message);
  canvas.drawText(
    node.message,
    rect.x + (rect.width - width) / 2,
    rect.y + rect.height / 2,
    paint,
    font,
  );

  const labelFont = resolveFont(resources, '', Math.min(18, rect.width / 16));
  const labelWidth = labelFont.getTextWidth(node.slotLabel);
  canvas.drawText(
    node.slotLabel,
    rect.x + (rect.width - labelWidth) / 2,
    rect.y + rect.height / 2 + labelFont.getSize() * 1.6,
    fill(POSTER_COLORS.inkMuted, 1),
    labelFont,
  );
}

function drawText(canvas: SkCanvas, node: TextNode, resources: PosterResources): void {
  const font = resolveFont(resources, node.style.fontFile, node.style.fontSize);
  const paint = fill(node.style.color, node.opacity);

  // Re-measure with the real face and re-align inside the same box, so the
  // approximation used during layout never shifts the visible result.
  const measured = font.getTextWidth(node.text);
  let x = node.x;
  if (node.align === 'center') x = node.x + (node.width - measured) / 2;
  else if (node.align === 'right') x = node.x + (node.width - measured);

  if (node.style.letterSpacing !== 0) {
    let cursor = x;
    for (const char of node.text) {
      canvas.drawText(char, cursor, node.baseline, paint, font);
      cursor += font.getTextWidth(char) + node.style.letterSpacing;
    }
    return;
  }

  canvas.drawText(node.text, x, node.baseline, paint, font);
}

function drawQrFrame(canvas: SkCanvas, node: Extract<RenderNode, { kind: 'qr' }>): void {
  // The QR modules themselves are drawn by the QR element component, which
  // encodes `value`; this keeps the painter free of encoding logic.
  const rect = Skia.XYWHRect(node.rect.x, node.rect.y, node.rect.width, node.rect.height);
  canvas.drawRect(rect, fill(node.background, node.opacity));
  canvas.drawRect(rect, stroke(node.foreground, 2, node.opacity));
}

function drawGuides(canvas: SkCanvas, layout: PosterLayout): void {
  const guide = stroke('#2F6FED', 2, 0.5);
  const margin = 48;
  canvas.drawRect(
    Skia.XYWHRect(margin, margin, layout.canvas.width - margin * 2, layout.canvas.height - margin * 2),
    guide,
  );
}

function resolveFont(resources: PosterResources, fontFile: string, size: number): SkFont {
  const key = `${fontFile}@${size}`;
  const cached = fontCache.get(key);
  if (cached) return cached;

  const typeface = fontFile ? resources.typeface(fontFile) : null;
  const font = typeface ? Skia.Font(typeface, size) : Skia.Font(undefined, size);
  fontCache.set(key, font);
  return font;
}

export function clearFontCache(): void {
  fontCache.clear();
}
