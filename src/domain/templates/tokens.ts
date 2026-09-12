import type { AutoFitPolicy, FlowConstraints, TextStyle } from '@/domain/types/elements';

/**
 * POSTER DESIGN TOKENS
 *
 * These are the poster's own colours and type scale — formal, warm and printed-
 * looking, in the visual language of the association's existing posters. They
 * are deliberately separate from the APP's design system (src/theme), which is
 * a modern mobile UI. The tool may look contemporary; the poster must not.
 */
export const POSTER_COLORS = {
  paper: '#FCF4E4',
  paperDeep: '#F6E9CE',
  maroon: '#7B1113',
  maroonDeep: '#571011',
  gold: '#B8891F',
  goldLight: '#D9B45B',
  ink: '#24201B',
  inkMuted: '#5C544A',
  green: '#1F5D3E',
  saffron: '#D06A15',
  line: '#C2A15A',
} as const;

export const POSTER_FONTS = {
  display: 'poster-serif',
  body: 'poster-sans',
  devanagari: 'poster-devanagari',
  kannada: 'poster-kannada',
} as const;

type StyleOverrides = Partial<TextStyle>;

export function textStyle(base: TextStyle, overrides: StyleOverrides = {}): TextStyle {
  return { ...base, ...overrides };
}

const BASE: TextStyle = {
  fontFamily: POSTER_FONTS.body,
  fontSize: 26,
  fontWeight: 'regular',
  color: POSTER_COLORS.ink,
  align: 'center',
  lineHeight: 1.3,
  letterSpacing: 0,
};

export const POSTER_TEXT = {
  associationName: textStyle(BASE, {
    fontFamily: POSTER_FONTS.display,
    fontSize: 46,
    fontWeight: 'bold',
    color: POSTER_COLORS.maroon,
    letterSpacing: 1.2,
    lineHeight: 1.15,
  }),
  associationNameLocal: textStyle(BASE, {
    fontFamily: POSTER_FONTS.devanagari,
    fontSize: 30,
    fontWeight: 'medium',
    color: POSTER_COLORS.maroonDeep,
    lineHeight: 1.4,
  }),
  officeName: textStyle(BASE, {
    fontSize: 34,
    fontWeight: 'semibold',
    color: POSTER_COLORS.green,
    letterSpacing: 0.6,
  }),
  officeAddress: textStyle(BASE, {
    fontSize: 22,
    color: POSTER_COLORS.inkMuted,
    lineHeight: 1.35,
  }),
  eventTitle: textStyle(BASE, {
    fontFamily: POSTER_FONTS.display,
    fontSize: 64,
    fontWeight: 'bold',
    color: POSTER_COLORS.maroon,
    lineHeight: 1.18,
    letterSpacing: 0.4,
  }),
  eventSubtitle: textStyle(BASE, {
    fontSize: 32,
    fontWeight: 'medium',
    color: POSTER_COLORS.saffron,
    lineHeight: 1.25,
  }),
  meta: textStyle(BASE, {
    fontSize: 30,
    fontWeight: 'semibold',
    color: POSTER_COLORS.ink,
  }),
  metaSecondary: textStyle(BASE, {
    fontSize: 26,
    color: POSTER_COLORS.inkMuted,
    lineHeight: 1.35,
  }),
  sectionHeading: textStyle(BASE, {
    fontFamily: POSTER_FONTS.display,
    fontSize: 30,
    fontWeight: 'bold',
    color: POSTER_COLORS.maroon,
    letterSpacing: 2.4,
    uppercase: true,
  }),
  roleLabel: textStyle(BASE, {
    fontSize: 19,
    fontWeight: 'semibold',
    color: POSTER_COLORS.gold,
    letterSpacing: 2,
    uppercase: true,
  }),
  personName: textStyle(BASE, {
    fontSize: 25,
    fontWeight: 'semibold',
    color: POSTER_COLORS.ink,
    lineHeight: 1.22,
  }),
  personDetail: textStyle(BASE, {
    fontSize: 20,
    color: POSTER_COLORS.inkMuted,
    lineHeight: 1.26,
  }),
  bullet: textStyle(BASE, {
    fontSize: 19,
    color: POSTER_COLORS.inkMuted,
    align: 'left',
    lineHeight: 1.26,
  }),
  programmeTime: textStyle(BASE, {
    fontSize: 21,
    fontWeight: 'semibold',
    color: POSTER_COLORS.green,
    align: 'left',
  }),
  programmeTitle: textStyle(BASE, {
    fontSize: 23,
    color: POSTER_COLORS.ink,
    align: 'left',
    lineHeight: 1.26,
  }),
  footer: textStyle(BASE, {
    fontSize: 24,
    fontWeight: 'medium',
    color: POSTER_COLORS.maroonDeep,
    lineHeight: 1.3,
  }),
} as const;

export function autoFit(overrides: Partial<AutoFitPolicy> = {}): AutoFitPolicy {
  return {
    enabled: true,
    minFontSize: 18,
    maxFontSize: 200,
    minLineHeightScale: 0.88,
    ...overrides,
  };
}

export function flow(overrides: Partial<FlowConstraints> = {}): FlowConstraints {
  return { gapBelow: 24, canGrow: false, canShrink: false, pinned: true, ...overrides };
}
