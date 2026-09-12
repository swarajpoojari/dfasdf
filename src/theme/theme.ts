import { Platform } from 'react-native';

/**
 * APP DESIGN SYSTEM
 *
 * The tool is modern; the poster is not. This palette belongs to the app shell
 * only — cards, sheets, buttons. Poster colours live in
 * `domain/templates/tokens.ts` and must never be imported into a template.
 */
export const colors = {
  background: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EEE9',
  surfaceSunken: '#EAE5DE',

  primary: '#7B1113',
  primaryDark: '#571011',
  primarySoft: '#F7E7E4',

  accent: '#B8891F',
  accentSoft: '#FAF0D9',

  success: '#1F6F4A',
  successSoft: '#E4F2EA',
  warning: '#9A6212',
  warningSoft: '#FBF0DC',
  danger: '#B3261E',
  dangerSoft: '#FBE7E5',

  ink: '#1A1714',
  inkSecondary: '#54504A',
  inkMuted: '#8A847C',
  border: '#E2DDD5',
  borderStrong: '#CFC8BE',

  overlay: 'rgba(20, 17, 14, 0.45)',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1 },
} as const;

export const elevation = {
  card: Platform.select({
    ios: {
      shadowColor: '#2A2016',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 2 },
  }),
  sheet: Platform.select({
    ios: {
      shadowColor: '#2A2016',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -4 },
    },
    default: { elevation: 12 },
  }),
} as const;

/** Subtle by design: this is an internal tool, not a showreel. */
export const motion = {
  fast: 140,
  normal: 220,
  slow: 320,
  stagger: 45,
} as const;
