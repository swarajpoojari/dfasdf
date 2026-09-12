import type { EventTypeDefinition } from '@/domain/types/eventType';

const NO_SECTIONS = { programme: false, guests: false, felicitation: false } as const;

/**
 * Event types are configuration, exactly like offices. Adding "Vidyarthi
 * Sanman" later is one entry here plus, optionally, a template that declares it.
 */
export const EVENT_TYPES: readonly EventTypeDefinition[] = [
  {
    id: 'guru-jayanti',
    name: 'Guru Jayanti',
    nameLocal: 'गुरु जयंती',
    description: 'Annual Jayanti of Brahma Shree Narayana Guru Swami.',
    icon: 'white-balance-sunny',
    sections: { programme: true, guests: true, felicitation: true },
    requiredSlotIds: ['slot.association.logo', 'slot.guru.narayana'],
    active: true,
  },
  {
    id: 'dharmika-sabha',
    name: 'Dharmika Sabha',
    description: 'Religious assembly with presiding dignitaries and invited guests.',
    icon: 'account-group',
    sections: { programme: true, guests: true, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'felicitation',
    name: 'Felicitation',
    description: 'Honouring members of the community for their achievements.',
    icon: 'medal',
    sections: { programme: false, guests: true, felicitation: true },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'cultural-programme',
    name: 'Cultural Programme',
    description: 'Music, dance, drama and other cultural presentations.',
    icon: 'drama-masks',
    sections: { programme: true, guests: true, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'community-meeting',
    name: 'Community Meeting',
    description: 'General meeting of members of a local office.',
    icon: 'forum',
    sections: { programme: true, guests: false, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'annual-function',
    name: 'Annual Function',
    description: 'Annual day of the association or a local office.',
    icon: 'calendar-star',
    sections: { programme: true, guests: true, felicitation: true },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'religious-function',
    name: 'Religious Function',
    description: 'Pooja, bhajan, Koti-Chennaya and other religious observances.',
    icon: 'candle',
    sections: { programme: true, guests: true, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'youth-programme',
    name: 'Youth Programme',
    description: 'Events organised by and for the youth wing.',
    icon: 'run-fast',
    sections: { programme: true, guests: true, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'womens-programme',
    name: "Women's Programme",
    description: 'Events organised by and for the Mahila Vibhag.',
    icon: 'flower',
    sections: { programme: true, guests: true, felicitation: true },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'sports-event',
    name: 'Sports Event',
    description: 'Tournaments, sports day and athletic meets.',
    icon: 'trophy',
    sections: { programme: true, guests: true, felicitation: true },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'blood-donation',
    name: 'Blood Donation',
    description: 'Blood donation camps organised by the association.',
    icon: 'water',
    sections: { programme: false, guests: true, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'social-service',
    name: 'Social Service Event',
    description: 'Health camps, relief work and other social service activities.',
    icon: 'hand-heart',
    sections: { programme: true, guests: true, felicitation: false },
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'festival',
    name: 'Festival',
    description: 'Festival greetings and community celebrations.',
    icon: 'party-popper',
    sections: NO_SECTIONS,
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
  {
    id: 'general-announcement',
    name: 'General Announcement',
    description: 'Notices and announcements from the association or a local office.',
    icon: 'bullhorn',
    sections: NO_SECTIONS,
    requiredSlotIds: ['slot.association.logo'],
    active: true,
  },
];

export function findEventType(id: string): EventTypeDefinition | undefined {
  return EVENT_TYPES.find((eventType) => eventType.id === id);
}

export function activeEventTypes(): readonly EventTypeDefinition[] {
  return EVENT_TYPES.filter((eventType) => eventType.active);
}
