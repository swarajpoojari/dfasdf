export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** All rectangles in the poster domain are expressed in DESIGN units (see canvas.ts). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

export const insets = (top: number, right = top, bottom = top, left = right): EdgeInsets => ({
  top,
  right,
  bottom,
  left,
});

export const rectRight = (r: Rect): number => r.x + r.width;
export const rectBottom = (r: Rect): number => r.y + r.height;

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(rectRight(a) <= b.x || rectRight(b) <= a.x || rectBottom(a) <= b.y || rectBottom(b) <= a.y);
}

export function intersectionArea(a: Rect, b: Rect): number {
  const width = Math.min(rectRight(a), rectRight(b)) - Math.max(a.x, b.x);
  const height = Math.min(rectBottom(a), rectBottom(b)) - Math.max(a.y, b.y);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    rectRight(inner) <= rectRight(outer) &&
    rectBottom(inner) <= rectBottom(outer)
  );
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Fits `content` inside `box` without ever changing its aspect ratio.
 * Protected official assets may only ever be scaled through this function.
 */
export function fitContain(content: Size, box: Size): Size {
  if (content.width <= 0 || content.height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(box.width / content.width, box.height / content.height);
  return { width: content.width * scale, height: content.height * scale };
}

export function centerIn(content: Size, box: Rect): Rect {
  return {
    x: box.x + (box.width - content.width) / 2,
    y: box.y + (box.height - content.height) / 2,
    width: content.width,
    height: content.height,
  };
}
