import { SAFE_MARGIN } from '@/domain/types/canvas';
import { isAssetBacked } from '@/domain/types/elements';
import { TEMPLATE_SCHEMA_VERSION } from '@/domain/types/template';
import { officeNeedsConfiguration } from '@/domain/offices/offices';
import type { ValidationFinding, ValidationRule } from './types';

/** Minimum pixels an image should have per design unit, for a crisp export. */
const MIN_PIXELS_PER_DESIGN_UNIT = 1;

const finding = (
  rule: Pick<ValidationRule, 'id' | 'title' | 'severity'>,
  message: string,
  extra: Partial<ValidationFinding> = {},
): ValidationFinding => ({
  ruleId: rule.id,
  severity: rule.severity,
  title: rule.title,
  message,
  ...extra,
});

const officialLogo: ValidationRule = {
  id: 'official-logo',
  title: 'Official Association Logo',
  severity: 'error',
  run({ document, lookupAsset }) {
    const logo = document.elements.find(
      (element) => element.type === 'OFFICIAL_LOGO' && element.slotId === 'slot.association.logo',
    );
    if (!logo) {
      return [finding(officialLogo, 'This template has no place for the association logo.')];
    }
    if (!logo.visible) {
      return [
        finding(officialLogo, 'The association logo is hidden. Association posters must carry the official logo.', {
          elementId: logo.id,
        }),
      ];
    }
    const assetId = isAssetBacked(logo) ? logo.assetId : undefined;
    const asset = assetId ? lookupAsset(assetId) : undefined;
    if (!asset || !asset.approved) {
      return [
        finding(
          officialLogo,
          'Approved asset required. The official Billawar Association logo has not been placed on this poster.',
          { elementId: logo.id },
        ),
      ];
    }
    return [];
  },
};

const requiredSlots: ValidationRule = {
  id: 'required-assets',
  title: 'Required official images',
  severity: 'error',
  run({ document, template, eventType, lookupAsset, lookupSlot }) {
    const needed = new Set([...template.requiredSlotIds, ...(eventType?.requiredSlotIds ?? [])]);
    needed.delete('slot.association.logo'); // covered by its own rule

    const findings: ValidationFinding[] = [];
    for (const slotId of needed) {
      const element = document.elements.find((candidate) => isAssetBacked(candidate) && candidate.slotId === slotId);
      const assetId = element && isAssetBacked(element) ? element.assetId : undefined;
      const asset = assetId ? lookupAsset(assetId) : undefined;
      if (asset?.approved) continue;

      const slot = lookupSlot(slotId);
      findings.push(
        finding(requiredSlots, `Approved asset required. ${slot?.label ?? slotId} has not been placed on this poster.`, {
          elementId: element?.id,
        }),
      );
    }
    return findings;
  },
};

const eventTitle: ValidationRule = {
  id: 'event-title',
  title: 'Event title',
  severity: 'error',
  run({ document }) {
    return document.eventDetails.title.trim()
      ? []
      : [finding(eventTitle, 'The poster has no event title yet.')];
  },
};

const eventDate: ValidationRule = {
  id: 'event-date',
  title: 'Event date',
  severity: 'error',
  run({ document }) {
    const { date, dateLabel } = document.eventDetails;
    return date || dateLabel?.trim()
      ? []
      : [finding(eventDate, 'The poster does not say when the event takes place.')];
  },
};

const eventVenue: ValidationRule = {
  id: 'event-venue',
  title: 'Venue',
  severity: 'error',
  run({ document }) {
    return document.eventDetails.venue?.name?.trim()
      ? []
      : [finding(eventVenue, 'The poster does not say where the event takes place.')];
  },
};

const guestInformation: ValidationRule = {
  id: 'guest-information',
  title: 'Guest information',
  severity: 'warning',
  run({ document, eventType }) {
    if (!eventType?.sections.guests) return [];
    return document.eventDetails.guests.length > 0
      ? []
      : [finding(guestInformation, 'No guests have been added, and this kind of event usually lists them.')];
  },
};

const programmeInformation: ValidationRule = {
  id: 'programme-information',
  title: 'Programme',
  severity: 'warning',
  run({ document, eventType }) {
    if (!eventType?.sections.programme) return [];
    const hasSection = document.elements.some((element) => element.type === 'PROGRAMME_LIST' && element.visible);
    if (!hasSection) return [];
    return document.eventDetails.programme.length > 0
      ? []
      : [finding(programmeInformation, 'The programme section is empty.')];
  },
};

const textFits: ValidationRule = {
  id: 'text-fits',
  title: 'Text fits its box',
  severity: 'error',
  run({ layout }) {
    return layout.issues
      .filter((issue) => issue.code === 'TEXT_OVERFLOW' || issue.code === 'TEXT_TRUNCATED')
      .map((issue) =>
        finding(textFits, issue.message, {
          elementId: issue.elementId,
          autoFix: issue.autoFixable
            ? {
                label: 'Fix Automatically',
                description: 'Tighten the spacing and type size of this section within the limits the template allows.',
                kind: 'relax-section',
                elementId: issue.elementId,
              }
            : undefined,
        }),
      );
  },
};

const noOverlap: ValidationRule = {
  id: 'no-overlap',
  title: 'Nothing overlapping',
  severity: 'warning',
  run({ layout }) {
    return layout.issues
      .filter((issue) => issue.code === 'ELEMENT_OVERLAP')
      .map((issue) => finding(noOverlap, issue.message, { elementId: issue.elementId }));
  },
};

const insideCanvas: ValidationRule = {
  id: 'inside-canvas',
  title: 'Everything inside the poster',
  severity: 'error',
  run({ layout }) {
    return layout.issues
      .filter((issue) => issue.code === 'ELEMENT_OUTSIDE_CANVAS')
      .map((issue) =>
        finding(insideCanvas, issue.message, {
          elementId: issue.elementId,
          autoFix: {
            label: 'Fix Automatically',
            description: `Move it back inside the ${SAFE_MARGIN}-unit safe margin.`,
            kind: 'nudge-into-canvas',
            elementId: issue.elementId,
          },
        }),
      );
  },
};

const imageResolution: ValidationRule = {
  id: 'image-resolution',
  title: 'Image quality',
  severity: 'warning',
  run({ document, layout, lookupAsset }) {
    const findings: ValidationFinding[] = [];
    for (const element of document.elements) {
      if (!isAssetBacked(element) || !element.assetId || !element.visible) continue;
      const asset = lookupAsset(element.assetId);
      if (!asset) continue;
      const placed = layout.elements.find((candidate) => candidate.elementId === element.id);
      const frame = placed?.frame ?? element.frame;
      const ratio = Math.min(asset.width / frame.width, asset.height / frame.height);
      if (ratio < MIN_PIXELS_PER_DESIGN_UNIT) {
        findings.push(
          finding(
            imageResolution,
            `"${asset.name}" is smaller than the space it fills, so it may look soft when exported at high resolution.`,
            { elementId: element.id },
          ),
        );
      }
    }
    return findings;
  },
};

const templateVersion: ValidationRule = {
  id: 'template-version',
  title: 'Template up to date',
  severity: 'warning',
  run({ document, template }) {
    if (document.schemaVersion !== TEMPLATE_SCHEMA_VERSION) {
      return [
        finding(
          templateVersion,
          'This poster was made with an older version of the app and needs to be updated before it can be exported.',
        ),
      ];
    }
    if (document.templateVersion !== template.version) {
      return [
        finding(
          templateVersion,
          `"${template.name}" has been updated to version ${template.version} since this poster was created.`,
        ),
      ];
    }
    return [];
  },
};

const officeConfigured: ValidationRule = {
  id: 'office-configured',
  title: 'Local office details',
  severity: 'warning',
  run({ office }) {
    return officeNeedsConfiguration(office)
      ? [
          finding(
            officeConfigured,
            `The address for ${office.name} has not been filled in yet, so the poster will show placeholder text.`,
          ),
        ]
      : [];
  },
};

export const VALIDATION_RULES: readonly ValidationRule[] = [
  officialLogo,
  requiredSlots,
  eventTitle,
  eventDate,
  eventVenue,
  guestInformation,
  programmeInformation,
  textFits,
  noOverlap,
  insideCanvas,
  imageResolution,
  templateVersion,
  officeConfigured,
];
