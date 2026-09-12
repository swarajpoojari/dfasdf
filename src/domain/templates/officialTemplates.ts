import type { PosterTemplate } from '@/domain/types/template';
import { POSTER_COLORS } from './tokens';
import { buildCommunityPosterTemplate } from './communityPoster';

/**
 * The official template library that ships with the app.
 *
 * The Guru Jayanti template follows the association's reference poster:
 * association header, local office, event title, approved image of Brahma Shree
 * Narayana Guru, Dharmika Sabha, felicitation, footer.
 */
export const OFFICIAL_TEMPLATES: readonly PosterTemplate[] = [
  buildCommunityPosterTemplate({
    id: 'tpl.guru-jayanti.classic',
    name: 'Guru Jayanti — Classic',
    description:
      'The association’s formal Jayanti poster: approved Guru image, Dharmika Sabha and felicitation sections.',
    eventTypes: ['guru-jayanti'],
    version: 1,
    updatedAt: '2026-01-15',
    hero: { slotId: 'slot.guru.narayana', required: true, height: 220 },
    guests: { enabled: true, heading: 'DHARMIKA SABHA', weight: 1.15 },
    felicitation: { enabled: true, heading: 'FELICITATION', weight: 1 },
    titleFontSize: 62,
    accent: POSTER_COLORS.maroon,
  }),
  buildCommunityPosterTemplate({
    id: 'tpl.dharmika-sabha.classic',
    name: 'Dharmika Sabha — Classic',
    description: 'Religious assembly poster with programme schedule and invited dignitaries.',
    eventTypes: ['dharmika-sabha', 'religious-function'],
    version: 1,
    updatedAt: '2026-01-15',
    hero: { slotId: 'slot.guru.narayana', required: false, height: 212 },
    programme: { enabled: true, heading: 'PROGRAMME', weight: 1 },
    guests: { enabled: true, heading: 'DHARMIKA SABHA', weight: 1 },
    titleFontSize: 58,
    accent: POSTER_COLORS.maroonDeep,
  }),
  buildCommunityPosterTemplate({
    id: 'tpl.felicitation.honours',
    name: 'Felicitation — Honours',
    description: 'Honouring members of the community, with room for long citations.',
    eventTypes: ['felicitation', 'annual-function', 'womens-programme', 'sports-event'],
    version: 1,
    updatedAt: '2026-01-15',
    guests: { enabled: true, heading: 'CHIEF GUESTS', weight: 0.8 },
    felicitation: { enabled: true, heading: 'FELICITATION', weight: 1.6 },
    titleFontSize: 56,
    accent: POSTER_COLORS.green,
  }),
  buildCommunityPosterTemplate({
    id: 'tpl.programme.general',
    name: 'Programme — General',
    description: 'Programme schedule with guests; suitable for cultural and youth events.',
    eventTypes: [
      'cultural-programme',
      'youth-programme',
      'community-meeting',
      'social-service',
      'blood-donation',
      'sports-event',
    ],
    version: 1,
    updatedAt: '2026-01-15',
    programme: { enabled: true, heading: 'PROGRAMME', weight: 1.5 },
    guests: { enabled: true, heading: 'GUESTS', weight: 1 },
    titleFontSize: 56,
    accent: POSTER_COLORS.saffron,
  }),
  buildCommunityPosterTemplate({
    id: 'tpl.announcement.simple',
    name: 'Announcement — Simple',
    description: 'A clean notice for festival greetings and general announcements.',
    eventTypes: ['festival', 'general-announcement'],
    version: 1,
    updatedAt: '2026-01-15',
    hero: { slotId: 'slot.decoration.border', required: false, height: 280 },
    titleFontSize: 70,
    accent: POSTER_COLORS.maroon,
  }),
];
