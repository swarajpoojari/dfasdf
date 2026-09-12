import { clamp } from '@/domain/types/common';
import type {
  FelicitationListElement,
  GuestListElement,
  ListElement,
  ProgrammeListElement,
  TextAlign,
  TextStyle,
} from '@/domain/types/elements';
import type {
  FelicitationEntry,
  GuestEntry,
  GuestRole,
  ProgrammeItem,
} from '@/domain/types/content';
import { GUEST_ROLE_LABELS, guestsByRole } from '@/domain/types/content';
import type { TextMeasurer } from './textMeasure';
import { wrapText } from './wrap';

/** One laid-out line, positioned relative to its element's content origin. */
export interface MeasuredLine {
  readonly text: string;
  readonly style: TextStyle;
  readonly fontSize: number;
  readonly top: number;
  readonly lineHeight: number;
  readonly indent: number;
  readonly boxWidth: number;
  readonly align: TextAlign;
}

export interface MeasuredContent {
  readonly lines: readonly MeasuredLine[];
  readonly height: number;
  readonly truncated: boolean;
}

export const EMPTY_CONTENT: MeasuredContent = { lines: [], height: 0, truncated: false };

export function scaleStyle(style: TextStyle, scale: number, min: number, max: number): TextStyle {
  return { ...style, fontSize: clamp(style.fontSize * scale, min, max) };
}

interface Cursor {
  top: number;
  lines: MeasuredLine[];
  truncated: boolean;
}

function emit(
  cursor: Cursor,
  text: string,
  style: TextStyle,
  measurer: TextMeasurer,
  options: { indent?: number; width: number; lineHeightScale?: number; prefix?: string },
): void {
  const indent = options.indent ?? 0;
  const measureStyle = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
  };
  const body = options.prefix ? `${options.prefix}${text}` : text;
  const { lines } = wrapText(body, options.width, measureStyle, measurer);
  const lineHeight = style.fontSize * style.lineHeight * (options.lineHeightScale ?? 1);

  for (const line of lines) {
    cursor.lines.push({
      text: line,
      style,
      fontSize: style.fontSize,
      top: cursor.top,
      lineHeight,
      indent,
      boxWidth: options.width,
      align: style.align,
    });
    cursor.top += lineHeight;
  }
}

function newCursor(): Cursor {
  return { top: 0, lines: [], truncated: false };
}

function finish(cursor: Cursor): MeasuredContent {
  return { lines: cursor.lines, height: cursor.top, truncated: cursor.truncated };
}

function emitHeading(
  cursor: Cursor,
  element: ListElement,
  width: number,
  scale: number,
  measurer: TextMeasurer,
): void {
  if (!element.heading) return;
  const style = scaleStyle(
    element.headingStyle,
    scale,
    element.autoFit.minFontSize,
    element.autoFit.maxFontSize,
  );
  const text = style.uppercase ? element.heading.toUpperCase() : element.heading;
  emit(cursor, text, style, measurer, { width });
  cursor.top += element.headingGap;
}

/* -------------------------------------------------------------------------- */
/* Programme                                                                  */
/* -------------------------------------------------------------------------- */

export function measureProgramme(
  element: ProgrammeListElement,
  items: readonly ProgrammeItem[],
  measurer: TextMeasurer,
  scale: number,
): MeasuredContent {
  const cursor = newCursor();
  const width = element.frame.width;
  emitHeading(cursor, element, width, scale, measurer);

  const { minFontSize: min, maxFontSize: max } = element.autoFit;
  const timeStyle = scaleStyle(element.secondaryStyle, scale, min, max);
  const titleStyle = scaleStyle(element.primaryStyle, scale, min, max);
  const detailStyle = scaleStyle(element.secondaryStyle, scale, min, max);
  const timeWidth = element.timeColumnWidth;
  const bodyWidth = Math.max(40, width - timeWidth);

  for (const item of items) {
    const rowTop = cursor.top;

    if (item.time) {
      emit(cursor, item.time, { ...timeStyle, align: 'left' }, measurer, { width: timeWidth });
    }
    const afterTime = cursor.top;

    cursor.top = rowTop;
    emit(cursor, item.title, { ...titleStyle, align: 'left' }, measurer, {
      indent: timeWidth,
      width: bodyWidth,
    });
    if (item.detail) {
      emit(cursor, item.detail, { ...detailStyle, align: 'left' }, measurer, {
        indent: timeWidth,
        width: bodyWidth,
      });
    }

    cursor.top = Math.max(cursor.top, afterTime) + element.rowGap;
  }

  if (items.length > 0) cursor.top -= element.rowGap;
  return finish(cursor);
}

/* -------------------------------------------------------------------------- */
/* Guests                                                                     */
/* -------------------------------------------------------------------------- */

export function measureGuests(
  element: GuestListElement,
  guests: readonly GuestEntry[],
  measurer: TextMeasurer,
  scale: number,
): MeasuredContent {
  const cursor = newCursor();
  const width = element.frame.width;
  emitHeading(cursor, element, width, scale, measurer);

  const { minFontSize: min, maxFontSize: max } = element.autoFit;
  const roleStyle = scaleStyle(element.roleStyle, scale, min, max);
  const nameStyle = scaleStyle(element.primaryStyle, scale, min, max);
  const designationStyle = scaleStyle(element.secondaryStyle, scale, min, max);

  const wanted = element.roles.length > 0 ? new Set(element.roles) : undefined;
  const groups = guestsByRole(guests).filter(
    (group) => !wanted || wanted.has(group.role as GuestRole),
  );

  groups.forEach((group, index) => {
    const label = roleStyle.uppercase
      ? GUEST_ROLE_LABELS[group.role].toUpperCase()
      : GUEST_ROLE_LABELS[group.role];
    emit(cursor, label, roleStyle, measurer, { width });

    for (const guest of group.entries) {
      emit(cursor, guest.name, nameStyle, measurer, { width });
      const secondary = [guest.designation, guest.organisation].filter(Boolean).join(', ');
      if (secondary) {
        emit(cursor, secondary, designationStyle, measurer, { width });
      }
    }
    if (index < groups.length - 1) cursor.top += element.rowGap;
  });

  return finish(cursor);
}

/* -------------------------------------------------------------------------- */
/* Felicitation                                                               */
/* -------------------------------------------------------------------------- */

function measureFelicitationEntry(
  cursor: Cursor,
  element: FelicitationListElement,
  entry: FelicitationEntry,
  measurer: TextMeasurer,
  scale: number,
  options: { indent: number; width: number },
): void {
  const { minFontSize: min, maxFontSize: max } = element.autoFit;
  const nameStyle = scaleStyle(element.primaryStyle, scale, min, max);
  const secondaryStyle = scaleStyle(element.secondaryStyle, scale, min, max);
  const bulletStyle = scaleStyle(element.bulletStyle, scale, min, max);

  emit(cursor, entry.name, nameStyle, measurer, options);

  if (entry.designation) {
    emit(cursor, entry.designation, secondaryStyle, measurer, options);
  }
  if (entry.description) {
    emit(cursor, entry.description, secondaryStyle, measurer, options);
  }
  for (const bullet of entry.bullets ?? []) {
    emit(cursor, bullet, bulletStyle, measurer, {
      ...options,
      prefix: `${element.bulletGlyph} `,
    });
  }
}

/** An entry is "short" when it is just a name and a one-line designation. */
function isShortEntry(entry: FelicitationEntry): boolean {
  return !entry.description && (entry.bullets?.length ?? 0) === 0;
}

/**
 * Felicitation is the section that grows most unpredictably: one poster has six
 * names and a designation each, the next has three names with four bullet
 * points. Two columns are used only while every entry stays short; the moment
 * any entry carries a description or bullets, the section falls back to a
 * single full-width column so nothing has to be squeezed.
 */
export function measureFelicitations(
  element: FelicitationListElement,
  entries: readonly FelicitationEntry[],
  measurer: TextMeasurer,
  scale: number,
): MeasuredContent {
  const width = element.frame.width;
  const useTwoColumns = element.columns === 2 && entries.length > 1 && entries.every(isShortEntry);

  if (!useTwoColumns) {
    const cursor = newCursor();
    emitHeading(cursor, element, width, scale, measurer);
    entries.forEach((entry, index) => {
      measureFelicitationEntry(cursor, element, entry, measurer, scale, { indent: 0, width });
      if (index < entries.length - 1) cursor.top += element.rowGap;
    });
    return finish(cursor);
  }

  const gutter = element.rowGap * 1.5;
  const columnWidth = (width - gutter) / 2;
  const headingCursor = newCursor();
  emitHeading(headingCursor, element, width, scale, measurer);

  const half = Math.ceil(entries.length / 2);
  const columns: readonly (readonly FelicitationEntry[])[] = [entries.slice(0, half), entries.slice(half)];

  const lines: MeasuredLine[] = [...headingCursor.lines];
  let tallest = 0;

  columns.forEach((column, columnIndex) => {
    const cursor = newCursor();
    cursor.top = headingCursor.top;
    column.forEach((entry, index) => {
      measureFelicitationEntry(cursor, element, entry, measurer, scale, {
        indent: columnIndex * (columnWidth + gutter),
        width: columnWidth,
      });
      if (index < column.length - 1) cursor.top += element.rowGap;
    });
    lines.push(...cursor.lines);
    tallest = Math.max(tallest, cursor.top);
  });

  return { lines, height: tallest, truncated: false };
}
