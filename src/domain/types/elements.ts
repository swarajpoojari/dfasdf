import type { CropMode } from './assets';
import type { Rect } from './common';

export const ELEMENT_TYPES = [
  'TEXT',
  'IMAGE',
  'OFFICIAL_LOGO',
  'SHAPE',
  'LINE',
  'DECORATION',
  'QR_CODE',
  'PROGRAMME_LIST',
  'GUEST_LIST',
  'FELICITATION_LIST',
] as const;

export type ElementType = (typeof ELEMENT_TYPES)[number];

export type TextAlign = 'left' | 'center' | 'right';
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextStyle {
  /** Font family id from the font registry (theme/fonts.ts) — never a raw system name. */
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: FontWeight;
  readonly color: string;
  readonly align: TextAlign;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly uppercase?: boolean;
}

/**
 * How an element responds when its content does not fit the frame the template
 * gave it. This is the heart of the felicitation-section requirement: content
 * grows, the layout engine re-flows what follows, and nothing is ever silently
 * clipped.
 */
export interface AutoFitPolicy {
  readonly enabled: boolean;
  /** Font size is only ever reduced within these bounds. */
  readonly minFontSize: number;
  readonly maxFontSize: number;
  /** Line height may be tightened to this fraction of its authored value. */
  readonly minLineHeightScale: number;
  /** The frame may grow to at most this height (design units). */
  readonly maxHeight?: number;
}

export const DEFAULT_AUTO_FIT: AutoFitPolicy = Object.freeze({
  enabled: true,
  minFontSize: 18,
  maxFontSize: 200,
  minLineHeightScale: 0.86,
});

/**
 * Elements in the same flow group are stacked vertically in zIndex-independent
 * document order. When one grows, the ones after it move down by the same
 * amount, and the group's trailing gap absorbs what it can.
 */
export interface FlowConstraints {
  readonly group?: string;
  /** Minimum gap kept below this element when the group re-flows. */
  readonly gapBelow: number;
  /** May this element's height increase to fit its content? */
  readonly canGrow: boolean;
  /** May it shrink when content is short, pulling the rest up? */
  readonly canShrink: boolean;
  /** Element keeps its authored position; the flow never moves it. */
  readonly pinned: boolean;
}

export const DEFAULT_FLOW: FlowConstraints = Object.freeze({
  gapBelow: 24,
  canGrow: false,
  canShrink: false,
  pinned: true,
});

/** Connects an element to a field of the structured EventDetails. */
export type ContentBindingPath =
  | 'title'
  | 'subtitle'
  | 'dateLabel'
  | 'time'
  | 'venue'
  | 'invitationNote'
  | 'footerNote'
  | 'officeName'
  | 'officeAddress'
  | 'associationName'
  | 'associationNameLocal'
  | 'programme'
  | 'guests'
  | 'felicitations';

export interface BaseElement {
  readonly id: string;
  readonly type: ElementType;
  /** Shown in the editor's layer list. */
  readonly name: string;
  readonly frame: Rect;
  readonly rotation: number;
  readonly zIndex: number;
  /** Locked elements cannot be moved or resized by the user. */
  readonly locked: boolean;
  readonly visible: boolean;
  readonly opacity: number;
  readonly flow: FlowConstraints;
}

export interface TextElement extends BaseElement {
  readonly type: 'TEXT';
  readonly style: TextStyle;
  readonly autoFit: AutoFitPolicy;
  /** Literal text; ignored when `binding` is set. */
  readonly text: string;
  readonly binding?: ContentBindingPath;
  /** Text rendered when the bound content is empty (editor only, never exported). */
  readonly placeholder?: string;
  readonly maxLines?: number;
  readonly required?: boolean;
}

export interface ImageElementBase extends BaseElement {
  /** Id of the OfficialAsset placed here; undefined means the slot is empty. */
  readonly assetId?: string;
  /** Slot this frame is reserved for; drives "Approved asset required." */
  readonly slotId?: string;
  readonly cropMode: CropMode;
  /** Aspect ratio is always preserved for protected assets; see fitContain. */
  readonly fit: 'contain' | 'cover';
  readonly required?: boolean;
}

export interface ImageElement extends ImageElementBase {
  readonly type: 'IMAGE';
}

export interface OfficialLogoElement extends ImageElementBase {
  readonly type: 'OFFICIAL_LOGO';
}

export interface DecorationElement extends ImageElementBase {
  readonly type: 'DECORATION';
}

export interface ShapeElement extends BaseElement {
  readonly type: 'SHAPE';
  readonly shape: 'rect' | 'roundedRect' | 'ellipse';
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
}

export interface LineElement extends BaseElement {
  readonly type: 'LINE';
  readonly color: string;
  readonly thickness: number;
  readonly ornament?: 'none' | 'diamond' | 'dots';
}

export interface QrCodeElement extends BaseElement {
  readonly type: 'QR_CODE';
  readonly value: string;
  readonly foreground: string;
  readonly background: string;
}

/** Shared shape of the three data-driven list sections. */
export interface ListSectionStyle {
  readonly heading?: string;
  readonly headingStyle: TextStyle;
  readonly primaryStyle: TextStyle;
  readonly secondaryStyle: TextStyle;
  readonly rowGap: number;
  readonly headingGap: number;
  readonly autoFit: AutoFitPolicy;
}

export interface ProgrammeListElement extends BaseElement, ListSectionStyle {
  readonly type: 'PROGRAMME_LIST';
  readonly binding: 'programme';
  /** Width reserved for the time column, in design units. */
  readonly timeColumnWidth: number;
}

export interface GuestListElement extends BaseElement, ListSectionStyle {
  readonly type: 'GUEST_LIST';
  readonly binding: 'guests';
  readonly roleStyle: TextStyle;
  /** Roles to include; empty means every role present in the content. */
  readonly roles: readonly string[];
}

export interface FelicitationListElement extends BaseElement, ListSectionStyle {
  readonly type: 'FELICITATION_LIST';
  readonly binding: 'felicitations';
  readonly bulletStyle: TextStyle;
  readonly bulletGlyph: string;
  /** Two-column layout is used only while entries stay short. */
  readonly columns: 1 | 2;
}

export type PosterElement =
  | TextElement
  | ImageElement
  | OfficialLogoElement
  | DecorationElement
  | ShapeElement
  | LineElement
  | QrCodeElement
  | ProgrammeListElement
  | GuestListElement
  | FelicitationListElement;

export type ListElement = ProgrammeListElement | GuestListElement | FelicitationListElement;
export type AssetBackedElement = ImageElement | OfficialLogoElement | DecorationElement;

export function isAssetBacked(element: PosterElement): element is AssetBackedElement {
  return element.type === 'IMAGE' || element.type === 'OFFICIAL_LOGO' || element.type === 'DECORATION';
}

export function isListElement(element: PosterElement): element is ListElement {
  return (
    element.type === 'PROGRAMME_LIST' ||
    element.type === 'GUEST_LIST' ||
    element.type === 'FELICITATION_LIST'
  );
}

export function isTextElement(element: PosterElement): element is TextElement {
  return element.type === 'TEXT';
}

/** Elements that carry text and therefore participate in overflow detection. */
export function carriesText(element: PosterElement): boolean {
  return isTextElement(element) || isListElement(element);
}
