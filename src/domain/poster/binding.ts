import { ASSOCIATION_NAME, ASSOCIATION_NAME_LOCAL } from '@/domain/offices/offices';
import type { EventDetails } from '@/domain/types/content';
import { venueToLines } from '@/domain/types/content';
import type { ContentBindingPath } from '@/domain/types/elements';
import type { LocalOffice } from '@/domain/types/office';

export interface BindingContext {
  readonly details: EventDetails;
  readonly office: LocalOffice;
}

/**
 * Resolves a template's content binding against the structured event data.
 *
 * This indirection is what keeps content and presentation apart: the template
 * says "the office name goes here, in this style"; the document says what the
 * office is. Neither needs to know about the other.
 */
export function resolveTextBinding(
  path: ContentBindingPath,
  { details, office }: BindingContext,
): string | undefined {
  switch (path) {
    case 'title':
      return details.title;
    case 'subtitle':
      return details.subtitle;
    case 'dateLabel':
      return details.dateLabel ?? details.date;
    case 'time':
      return details.time;
    case 'venue':
      return venueToLines(details.venue).join('\n');
    case 'invitationNote':
      return details.invitationNote;
    case 'footerNote':
      return details.footerNote ?? office.defaultFooter;
    case 'officeName':
      return office.name;
    case 'officeAddress':
      return office.address;
    case 'associationName':
      return ASSOCIATION_NAME;
    case 'associationNameLocal':
      return ASSOCIATION_NAME_LOCAL;
    case 'programme':
    case 'guests':
    case 'felicitations':
      // List bindings are resolved by the list elements themselves.
      return undefined;
    default:
      return undefined;
  }
}

export const BINDING_LABELS: Readonly<Record<ContentBindingPath, string>> = {
  title: 'Event title',
  subtitle: 'Subtitle',
  dateLabel: 'Date',
  time: 'Time',
  venue: 'Venue',
  invitationNote: 'Invitation note',
  footerNote: 'Footer',
  officeName: 'Local office name',
  officeAddress: 'Local office address',
  associationName: 'Association name',
  associationNameLocal: 'Association name (local script)',
  programme: 'Programme',
  guests: 'Guests',
  felicitations: 'Felicitation list',
};
