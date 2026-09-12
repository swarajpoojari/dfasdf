import type { AssetCategory } from '@/domain/types/assets';

/**
 * ASSET SLOTS
 *
 * A slot is a *declared requirement* for an official asset — "this poster needs
 * the association logo here". An OfficialAsset is the *approved binary* that
 * fills it.
 *
 * Keeping the two apart is what lets the app ship without ever inventing an
 * association logo or a picture of Sri Narayana Guru. Until the association
 * installs the real file (see docs/ASSET_REPLACEMENT.md) the slot is simply
 * unfilled: the renderer draws a clearly-marked placeholder, validation blocks
 * export, and the UI says "Approved asset required."
 *
 * At no point does the app substitute, approximate or generate the missing
 * image.
 */
export interface AssetSlot {
  readonly id: string;
  readonly label: string;
  readonly category: AssetCategory;
  /** Which office this slot belongs to; omitted for association-wide slots. */
  readonly officeId?: string;
  /** Shown in the asset library and in the "approved asset required" message. */
  readonly guidance: string;
  /** Recommended minimum pixel size for good export quality. */
  readonly recommendedMinWidth: number;
  readonly required: boolean;
}

export const ASSOCIATION_SLOTS: readonly AssetSlot[] = [
  {
    id: 'slot.association.logo',
    label: 'Billawar Association Mumbai — official logo',
    category: 'ASSOCIATION_LOGO',
    guidance: 'The registered association logo, exactly as supplied by the head office. Transparent PNG preferred.',
    recommendedMinWidth: 600,
    required: true,
  },
  {
    id: 'slot.guru.narayana',
    label: 'Brahma Shree Narayana Guru — approved image',
    category: 'GURU_IMAGE',
    guidance:
      'The image approved by the association. It is reproduced exactly as supplied — never redrawn, retouched or AI-enhanced.',
    recommendedMinWidth: 900,
    required: true,
  },
  {
    id: 'slot.kotichennaya.primary',
    label: 'Koti-Chennaya — approved image',
    category: 'KOTI_CHENNAYA_IMAGE',
    guidance: 'The approved community image of Koti-Chennaya. Used exactly as supplied.',
    recommendedMinWidth: 900,
    required: false,
  },
  {
    id: 'slot.temple.primary',
    label: 'Temple image — approved',
    category: 'TEMPLE_IMAGE',
    guidance: 'An approved photograph of the temple. Photographs are never stylised or regenerated.',
    recommendedMinWidth: 1200,
    required: false,
  },
  {
    id: 'slot.decoration.border',
    label: 'Decorative border',
    category: 'DECORATION',
    guidance: 'Optional decorative artwork approved for poster borders.',
    recommendedMinWidth: 1080,
    required: false,
  },
];

export const officeLogoSlotId = (officeId: string): string => `slot.office.${officeId}.logo`;

export function officeLogoSlot(officeId: string, officeName: string): AssetSlot {
  return {
    id: officeLogoSlotId(officeId),
    label: `${officeName} — official branding`,
    category: 'LOCAL_OFFICE_LOGO',
    officeId,
    guidance: `The branding supplied by the ${officeName}. Used exactly as supplied.`,
    recommendedMinWidth: 500,
    required: false,
  };
}

/** Message shown wherever a slot is unfilled. Wording is fixed by product rule 32. */
export const APPROVED_ASSET_REQUIRED = 'Approved asset required.';

export function slotMissingMessage(slot: AssetSlot): string {
  return `${APPROVED_ASSET_REQUIRED} ${slot.label} has not been installed yet.`;
}
