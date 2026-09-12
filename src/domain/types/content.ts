/**
 * STRUCTURED POSTER CONTENT
 *
 * This is the poster's data. It is deliberately independent of any template:
 * the same event can be re-rendered into a different template, or a template
 * can be updated to version 2, without the user retyping anything.
 *
 * AI may help produce and tidy the values in this file (titles, descriptions,
 * schedule formatting). AI never produces the imagery that sits beside them.
 */

export interface ProgrammeItem {
  readonly id: string;
  /** Free text so "5.00 pm", "संध्याकाळी ५.००" and "Session II" all work. */
  readonly time: string;
  readonly title: string;
  readonly detail?: string;
}

export type GuestRole =
  | 'PRESIDED_BY'
  | 'CHIEF_GUEST'
  | 'GUEST_OF_HONOUR'
  | 'GUEST'
  | 'SPEAKER'
  | 'ORGANISER';

export const GUEST_ROLE_LABELS: Readonly<Record<GuestRole, string>> = {
  PRESIDED_BY: 'Presided By',
  CHIEF_GUEST: 'Chief Guest',
  GUEST_OF_HONOUR: 'Guest of Honour',
  GUEST: 'Guests',
  SPEAKER: 'Speaker',
  ORGANISER: 'Organiser',
};

/** Order guests appear in on the poster, irrespective of entry order. */
export const GUEST_ROLE_ORDER: readonly GuestRole[] = [
  'PRESIDED_BY',
  'CHIEF_GUEST',
  'GUEST_OF_HONOUR',
  'SPEAKER',
  'GUEST',
  'ORGANISER',
];

export interface GuestEntry {
  readonly id: string;
  readonly role: GuestRole;
  /** Honorific is kept in the name, e.g. "Dharmadarshi Ramesh M. Poojary". */
  readonly name: string;
  readonly designation?: string;
  readonly organisation?: string;
}

export interface FelicitationEntry {
  readonly id: string;
  readonly name: string;
  readonly designation: string;
  readonly description?: string;
  readonly bullets?: readonly string[];
  /** Optional approved photograph — never an AI portrait. */
  readonly photoAssetId?: string;
}

export interface EventVenue {
  readonly name: string;
  readonly addressLine?: string;
  readonly landmark?: string;
}

export interface EventDetails {
  readonly title: string;
  readonly subtitle?: string;
  /** ISO date (yyyy-mm-dd). Formatting for the poster happens at render time. */
  readonly date?: string;
  /** Display string for the date, e.g. "Sunday, 14 September 2026". */
  readonly dateLabel?: string;
  readonly time?: string;
  readonly venue?: EventVenue;
  readonly invitationNote?: string;
  readonly footerNote?: string;
  readonly programme: readonly ProgrammeItem[];
  readonly guests: readonly GuestEntry[];
  readonly felicitations: readonly FelicitationEntry[];
}

export const EMPTY_EVENT_DETAILS: EventDetails = Object.freeze({
  title: '',
  programme: [],
  guests: [],
  felicitations: [],
});

export function guestsByRole(guests: readonly GuestEntry[]): readonly { role: GuestRole; entries: readonly GuestEntry[] }[] {
  return GUEST_ROLE_ORDER.map((role) => ({
    role,
    entries: guests.filter((guest) => guest.role === role),
  })).filter((group) => group.entries.length > 0);
}

export function venueToLines(venue: EventVenue | undefined): readonly string[] {
  if (!venue) return [];
  return [venue.name, venue.addressLine, venue.landmark].filter(
    (line): line is string => Boolean(line && line.trim()),
  );
}
