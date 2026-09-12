import { DESIGN_CANVAS } from '@/domain/types/canvas';
import type { PosterElement, TextElement } from '@/domain/types/elements';
import type { PosterTemplate, TemplateLanguage } from '@/domain/types/template';
import { TEMPLATE_SCHEMA_VERSION } from '@/domain/types/template';
import { officeLogoSlotId } from '@/domain/assets/slots';
import { POSTER_COLORS, POSTER_TEXT, autoFit, flow, textStyle } from './tokens';

/**
 * Builder for the association's formal community poster.
 *
 * Every official template is produced by this one function. Adding a template
 * means describing which sections it carries and what the headings say — not
 * re-authoring 25 element frames, and certainly not writing a new screen.
 *
 * The vertical structure mirrors the association's existing posters:
 *
 *   logos + association name
 *   local office name + address
 *   event title (+ subtitle)
 *   approved hero image
 *   date / time / venue
 *   named sections (programme, Dharmika Sabha, felicitation)
 *   footer + decorative rules
 */
export interface SectionConfig {
  readonly enabled: boolean;
  readonly heading: string;
  /** Relative share of the body region this section is authored to take. */
  readonly weight: number;
}

export interface CommunityPosterConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly eventTypes: readonly string[];
  readonly localOfficeId?: string | null;
  readonly languages?: readonly TemplateLanguage[];
  readonly version: number;
  readonly updatedAt: string;
  /** Approved image shown between the title and the details, e.g. Narayana Guru. */
  readonly hero?: { readonly slotId: string; readonly required: boolean; readonly height?: number };
  readonly programme?: Partial<SectionConfig>;
  readonly guests?: Partial<SectionConfig>;
  readonly felicitation?: Partial<SectionConfig>;
  readonly titleFontSize?: number;
  readonly accent?: string;
}

const CANVAS = DESIGN_CANVAS;
const MARGIN = 64;
const CONTENT_WIDTH = CANVAS.width - MARGIN * 2;

const HEADER_TOP = 56;
const TITLE_TOP = 294;
const TITLE_HEIGHT = 118;
const SUBTITLE_HEIGHT = 40;
const FOOTER_RULE_Y = 1434;
const BODY_BOTTOM = FOOTER_RULE_Y - 12;

function section(config: Partial<SectionConfig> | undefined, fallbackHeading: string): SectionConfig {
  return {
    enabled: config?.enabled ?? false,
    heading: config?.heading ?? fallbackHeading,
    weight: config?.weight ?? 1,
  };
}

export function buildCommunityPosterTemplate(config: CommunityPosterConfig): PosterTemplate {
  const accent = config.accent ?? POSTER_COLORS.maroon;
  const programme = section(config.programme, 'PROGRAMME');
  const guests = section(config.guests, 'DHARMIKA SABHA');
  const felicitation = section(config.felicitation, 'FELICITATION');

  const elements: PosterElement[] = [];
  let z = 0;
  const next = (): number => (z += 1);

  /* ---------------------------------------------------------------- header */

  elements.push(
    {
      id: 'association-logo',
      type: 'OFFICIAL_LOGO',
      name: 'Association logo',
      frame: { x: MARGIN, y: HEADER_TOP, width: 132, height: 132 },
      rotation: 0,
      zIndex: next(),
      locked: true,
      visible: true,
      opacity: 1,
      flow: flow(),
      slotId: 'slot.association.logo',
      cropMode: 'none',
      fit: 'contain',
      required: true,
    },
    {
      id: 'office-logo',
      type: 'OFFICIAL_LOGO',
      name: 'Local office branding',
      frame: { x: CANVAS.width - MARGIN - 132, y: HEADER_TOP, width: 132, height: 132 },
      rotation: 0,
      zIndex: next(),
      locked: true,
      visible: true,
      opacity: 1,
      flow: flow(),
      slotId: config.localOfficeId ? officeLogoSlotId(config.localOfficeId) : undefined,
      cropMode: 'none',
      fit: 'contain',
      required: false,
    },
    heading('association-name', 'Association name', 'associationName', {
      x: MARGIN + 148,
      y: 62,
      width: CONTENT_WIDTH - 296,
      height: 58,
    }),
    heading('association-name-local', 'Association name (Devanagari)', 'associationNameLocal', {
      x: MARGIN + 148,
      y: 124,
      width: CONTENT_WIDTH - 296,
      height: 42,
    }),
    heading('office-name', 'Local office', 'officeName', {
      x: MARGIN,
      y: 196,
      width: CONTENT_WIDTH,
      height: 46,
    }),
    heading('office-address', 'Local office address', 'officeAddress', {
      x: MARGIN,
      y: 244,
      width: CONTENT_WIDTH,
      height: 38,
    }),
    rule('header-rule', 288, accent),
  );

  /* ----------------------------------------------------------------- title */

  const titleStyle = textStyle(POSTER_TEXT.eventTitle, {
    fontSize: config.titleFontSize ?? POSTER_TEXT.eventTitle.fontSize,
    color: accent,
  });

  elements.push({
    id: 'event-title',
    type: 'TEXT',
    name: 'Event title',
    frame: { x: MARGIN, y: TITLE_TOP, width: CONTENT_WIDTH, height: TITLE_HEIGHT },
    rotation: 0,
    zIndex: next(),
    locked: false,
    visible: true,
    opacity: 1,
    flow: flow({ group: 'title', gapBelow: 10, canGrow: true, pinned: true }),
    style: titleStyle,
    autoFit: autoFit({ minFontSize: 30, maxFontSize: 78, maxHeight: 176 }),
    text: '',
    binding: 'title',
    placeholder: 'Event title',
    required: true,
  });

  elements.push({
    id: 'event-subtitle',
    type: 'TEXT',
    name: 'Subtitle',
    frame: { x: MARGIN, y: TITLE_TOP + TITLE_HEIGHT + 8, width: CONTENT_WIDTH, height: SUBTITLE_HEIGHT },
    rotation: 0,
    zIndex: next(),
    locked: false,
    visible: true,
    opacity: 1,
    flow: flow({ group: 'title', gapBelow: 0, canGrow: true, canShrink: true, pinned: false }),
    style: POSTER_TEXT.eventSubtitle,
    autoFit: autoFit({ minFontSize: 22, maxFontSize: 40, maxHeight: 96 }),
    text: '',
    binding: 'subtitle',
    placeholder: 'Subtitle (optional)',
  });

  /* ------------------------------------------------------------------ hero */

  let cursor = TITLE_TOP + TITLE_HEIGHT + 8 + SUBTITLE_HEIGHT + 18;

  if (config.hero) {
    const height = config.hero.height ?? 268;
    const width = Math.round(height * 0.82);
    elements.push({
      id: 'hero-image',
      type: 'IMAGE',
      name: 'Approved image',
      frame: { x: (CANVAS.width - width) / 2, y: cursor, width, height },
      rotation: 0,
      zIndex: next(),
      locked: true,
      visible: true,
      opacity: 1,
      flow: flow({ gapBelow: 22 }),
      slotId: config.hero.slotId,
      cropMode: 'none',
      fit: 'contain',
      required: config.hero.required,
    });
    cursor += height + 22;
  }

  /* ------------------------------------------------------------------ meta */

  elements.push({
    id: 'event-datetime',
    type: 'TEXT',
    name: 'Date and time',
    frame: { x: MARGIN, y: cursor, width: CONTENT_WIDTH, height: 36 },
    rotation: 0,
    zIndex: next(),
    locked: false,
    visible: true,
    opacity: 1,
    flow: flow({ group: 'meta', gapBelow: 6, canGrow: true, pinned: true }),
    style: POSTER_TEXT.meta,
    autoFit: autoFit({ minFontSize: 20, maxFontSize: 34, maxHeight: 80 }),
    text: '',
    binding: 'dateLabel',
    placeholder: 'Date',
    required: true,
  });

  elements.push({
    id: 'event-venue',
    type: 'TEXT',
    name: 'Venue',
    frame: { x: MARGIN, y: cursor + 42, width: CONTENT_WIDTH, height: 78 },
    rotation: 0,
    zIndex: next(),
    locked: false,
    visible: true,
    opacity: 1,
    flow: flow({ group: 'meta', gapBelow: 0, canGrow: true, canShrink: true, pinned: false }),
    style: POSTER_TEXT.metaSecondary,
    autoFit: autoFit({ minFontSize: 17, maxFontSize: 28, maxHeight: 128 }),
    text: '',
    binding: 'venue',
    placeholder: 'Venue',
    required: true,
  });

  cursor += 42 + 78 + 20;

  /* ------------------------------------------------------------------ body */

  const bodySections = [
    { key: 'programme', config: programme },
    { key: 'guests', config: guests },
    { key: 'felicitation', config: felicitation },
  ].filter((entry) => entry.config.enabled);

  const bodyTop = cursor;
  const bodyHeight = Math.max(0, BODY_BOTTOM - bodyTop);
  const gap = 22;
  const available = bodyHeight - gap * Math.max(0, bodySections.length - 1);
  const totalWeight = bodySections.reduce((sum, entry) => sum + entry.config.weight, 0) || 1;

  let bodyCursor = bodyTop;
  for (const entry of bodySections) {
    const height = Math.floor((available * entry.config.weight) / totalWeight);
    const frame = { x: MARGIN, y: bodyCursor, width: CONTENT_WIDTH, height };
    const shared = {
      rotation: 0,
      zIndex: next(),
      locked: false,
      visible: true,
      opacity: 1,
      flow: flow({ group: 'body', gapBelow: gap, canGrow: true, canShrink: true, pinned: false }),
      headingStyle: textStyle(POSTER_TEXT.sectionHeading, { color: accent }),
      primaryStyle: POSTER_TEXT.personName,
      secondaryStyle: POSTER_TEXT.personDetail,
      rowGap: 10,
      headingGap: 12,
      autoFit: autoFit({ minFontSize: 16, maxFontSize: 40, maxHeight: Math.round(height * 2.6) }),
    } as const;

    if (entry.key === 'programme') {
      elements.push({
        ...shared,
        id: 'programme-list',
        type: 'PROGRAMME_LIST',
        name: entry.config.heading,
        frame,
        heading: entry.config.heading,
        binding: 'programme',
        primaryStyle: POSTER_TEXT.programmeTitle,
        secondaryStyle: POSTER_TEXT.programmeTime,
        timeColumnWidth: 190,
      });
    } else if (entry.key === 'guests') {
      elements.push({
        ...shared,
        id: 'guest-list',
        type: 'GUEST_LIST',
        name: entry.config.heading,
        frame,
        heading: entry.config.heading,
        binding: 'guests',
        roleStyle: POSTER_TEXT.roleLabel,
        roles: [],
      });
    } else {
      elements.push({
        ...shared,
        id: 'felicitation-list',
        type: 'FELICITATION_LIST',
        name: entry.config.heading,
        frame,
        heading: entry.config.heading,
        binding: 'felicitations',
        bulletStyle: POSTER_TEXT.bullet,
        bulletGlyph: '•',
        columns: 2,
      });
    }

    bodyCursor += height + gap;
  }

  /* ---------------------------------------------------------------- footer */

  elements.push(rule('footer-rule', FOOTER_RULE_Y, accent, 'diamond'));

  elements.push({
    id: 'footer-note',
    type: 'TEXT',
    name: 'Footer',
    frame: { x: MARGIN, y: 1444, width: CONTENT_WIDTH, height: 44 },
    rotation: 0,
    zIndex: next(),
    locked: false,
    visible: true,
    opacity: 1,
    flow: flow({ gapBelow: 0 }),
    style: POSTER_TEXT.footer,
    autoFit: autoFit({ minFontSize: 15, maxFontSize: 26, maxHeight: 44 }),
    text: '',
    binding: 'footerNote',
    placeholder: 'Footer message',
  });

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    localOfficeId: config.localOfficeId ?? null,
    eventTypes: config.eventTypes,
    languages: config.languages ?? ['en', 'hi', 'mr', 'kn'],
    version: config.version,
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    official: true,
    canvas: CANVAS,
    background: {
      color: POSTER_COLORS.paper,
      border: {
        color: accent,
        width: 10,
        inset: 22,
        innerColor: POSTER_COLORS.gold,
        innerWidth: 3,
        innerInset: 42,
      },
    },
    elements,
    requiredSlotIds: [
      'slot.association.logo',
      ...(config.hero?.required ? [config.hero.slotId] : []),
    ],
    updatedAt: config.updatedAt,
  };

  /* --------------------------------------------------------------- helpers */

  function heading(
    id: string,
    name: string,
    binding: TextElement['binding'],
    frame: { x: number; y: number; width: number; height: number },
  ): TextElement {
    const styleKey = id.includes('address')
      ? POSTER_TEXT.officeAddress
      : id.includes('office')
        ? POSTER_TEXT.officeName
        : id.includes('local')
          ? POSTER_TEXT.associationNameLocal
          : POSTER_TEXT.associationName;

    return {
      id,
      type: 'TEXT',
      name,
      frame,
      rotation: 0,
      zIndex: next(),
      locked: false,
      visible: true,
      opacity: 1,
      flow: flow({ gapBelow: 8 }),
      style: styleKey,
      autoFit: autoFit({ minFontSize: 16, maxFontSize: styleKey.fontSize }),
      text: '',
      binding,
      required: binding === 'officeName',
    };
  }

  function rule(id: string, y: number, color: string, ornament: 'none' | 'diamond' = 'none'): PosterElement {
    return {
      id,
      type: 'LINE',
      name: 'Decorative rule',
      frame: { x: MARGIN + 40, y, width: CONTENT_WIDTH - 80, height: 4 },
      rotation: 0,
      zIndex: next(),
      locked: true,
      visible: true,
      opacity: 1,
      flow: flow({ gapBelow: 12 }),
      color,
      thickness: 3,
      ornament,
    };
  }
}
