import type { CropMode } from '@/domain/types/assets';
import type { Rect, Size } from '@/domain/types/common';
import type { FontWeight, TextAlign } from '@/domain/types/elements';

/**
 * RENDER NODES
 *
 * The layout engine turns a PosterDocument into a flat, fully-resolved list of
 * primitives. Nodes carry absolute design-space coordinates and no conditional
 * logic, which means the painter is a dumb loop — and the same node list drives
 * the on-screen canvas and the full-resolution export.
 */

export interface ResolvedTextStyle {
  readonly fontFamilyId: string;
  readonly fontFile: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly color: string;
  readonly letterSpacing: number;
}

export interface TextNode {
  readonly kind: 'text';
  readonly elementId: string;
  readonly x: number;
  /** Baseline position, already including ascent. */
  readonly baseline: number;
  readonly width: number;
  readonly text: string;
  readonly align: TextAlign;
  readonly style: ResolvedTextStyle;
  readonly opacity: number;
}

export interface RectNode {
  readonly kind: 'rect';
  readonly elementId: string;
  readonly rect: Rect;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
  readonly ellipse?: boolean;
  readonly opacity: number;
}

export interface LineNode {
  readonly kind: 'line';
  readonly elementId: string;
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  readonly color: string;
  readonly thickness: number;
  readonly ornament: 'none' | 'diamond' | 'dots';
  readonly opacity: number;
}

export interface ImageNode {
  readonly kind: 'image';
  readonly elementId: string;
  readonly assetId: string;
  /** Frame the image is painted into, already aspect-correct. */
  readonly rect: Rect;
  readonly cropMode: CropMode;
  readonly opacity: number;
}

/**
 * Drawn where an official asset is expected but not installed. It is a hatched
 * box reading "APPROVED ASSET REQUIRED" — never a stand-in picture, and never
 * something a viewer could mistake for the real logo or image.
 */
export interface PlaceholderNode {
  readonly kind: 'placeholder';
  readonly elementId: string;
  readonly rect: Rect;
  readonly message: string;
  readonly slotLabel: string;
}

export interface QrNode {
  readonly kind: 'qr';
  readonly elementId: string;
  readonly rect: Rect;
  readonly value: string;
  readonly foreground: string;
  readonly background: string;
  readonly opacity: number;
}

export type RenderNode = TextNode | RectNode | LineNode | ImageNode | PlaceholderNode | QrNode;

/* -------------------------------------------------------------------------- */

export type LayoutIssueCode =
  | 'TEXT_OVERFLOW'
  | 'TEXT_TRUNCATED'
  | 'ELEMENT_OUTSIDE_CANVAS'
  | 'ELEMENT_OVERLAP'
  | 'OUTSIDE_SAFE_MARGIN'
  | 'MISSING_ASSET'
  | 'EMPTY_REQUIRED_CONTENT';

export interface LayoutIssue {
  readonly code: LayoutIssueCode;
  readonly elementId: string;
  readonly elementName: string;
  readonly message: string;
  /** Set when the layout engine could resolve this itself. */
  readonly autoFixable: boolean;
  readonly detail?: string;
}

/** Resolved geometry per element, used by the editor for hit-testing and handles. */
export interface ElementLayout {
  readonly elementId: string;
  readonly frame: Rect;
  readonly contentHeight: number;
  readonly grew: boolean;
  readonly shrank: boolean;
  readonly fontScale: number;
}

export interface PosterLayout {
  readonly canvas: Size;
  readonly backgroundColor: string;
  readonly nodes: readonly RenderNode[];
  readonly elements: readonly ElementLayout[];
  readonly issues: readonly LayoutIssue[];
  /** Asset ids the renderer must have decoded before painting. */
  readonly requiredAssetIds: readonly string[];
}
