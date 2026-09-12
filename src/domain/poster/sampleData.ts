import type { EventDetails } from '@/domain/types/content';

/**
 * Sample event content used by template previews, the onboarding tour and the
 * layout tests. It is deliberately awkward — long Kannada and Devanagari names,
 * a felicitation entry with four bullet points — because that is what the
 * layout engine has to survive.
 *
 * These are illustrative names for a demo, not real office bearers.
 */
export const SAMPLE_GURU_JAYANTI: EventDetails = {
  title: '172nd Guru Jayanthi of\nBrahma Shree Narayana Guru Swami',
  subtitle: 'Organised by the Billawar Association Mumbai',
  date: '2026-09-13',
  dateLabel: 'Sunday, 13 September 2026 · 5.00 pm onwards',
  time: '5.00 pm',
  venue: {
    name: 'Billawar Bhavan, Community Hall',
    addressLine: 'Sector 14, Vashi, Navi Mumbai 400703',
    landmark: 'Opposite the municipal garden',
  },
  invitationNote: 'All members and well-wishers are cordially invited.',
  footerNote: 'Billawar Association Mumbai — Navi Mumbai Local Office',
  programme: [
    { id: 'p1', time: '5.00 pm', title: 'Deepa Prajwalana and Guru Vandana' },
    { id: 'p2', time: '5.30 pm', title: 'Dharmika Sabha', detail: 'Address by the invited dignitaries' },
    { id: 'p3', time: '6.45 pm', title: 'Felicitation of achievers' },
    { id: 'p4', time: '7.30 pm', title: 'Cultural programme', detail: 'Presented by the Mahila Vibhag and Youth Wing' },
    { id: 'p5', time: '8.30 pm', title: 'Annadana' },
  ],
  guests: [
    { id: 'g1', role: 'PRESIDED_BY', name: 'Shri Harish G. Amin', designation: 'President, Billawar Association Mumbai' },
    { id: 'g2', role: 'CHIEF_GUEST', name: 'Dharmadarshi Ramesh M. Poojary', designation: 'Trustee' },
    { id: 'g3', role: 'GUEST_OF_HONOUR', name: 'श्रीमती सुनीता बी. सालियान', designation: 'Mahila Vibhag' },
    { id: 'g4', role: 'GUEST', name: 'ಶ್ರೀ ಸದಾನಂದ ಕೆ. ಸುವರ್ಣ', designation: 'Kannada Sangha' },
  ],
  felicitations: [
    {
      id: 'f1',
      name: 'Shri Rajesh Poojary',
      designation: 'Asst. Commissioner, GST',
      description: 'For distinguished service in public administration.',
      bullets: [
        'Topped the departmental examination in 2024',
        'Led the Mumbai zone taxpayer outreach programme',
        'Mentors students of the association’s coaching scheme',
        'Volunteer coordinator for the annual blood donation camp',
      ],
    },
    { id: 'f2', name: 'Kum. Ananya Salian', designation: 'National level Kabaddi player' },
  ],
};

/** A short poster, used to check that sections shrink as well as grow. */
export const SAMPLE_ANNOUNCEMENT: EventDetails = {
  title: 'Deepavali Greetings',
  subtitle: 'From all of us at the Dahisar Local Office',
  dateLabel: 'Sunday, 8 November 2026',
  venue: { name: 'Billawar Association Mumbai' },
  footerNote: 'Wishing every member a safe and joyful Deepavali.',
  programme: [],
  guests: [],
  felicitations: [],
};
