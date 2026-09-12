import { create } from 'zustand';

import { BUNDLED_OFFICIAL_ASSETS } from '@/../assets/official/manifest';
import { assetRegistry } from '@/domain/assets/registry';
import { auditRegistry, type IntegrityIssue } from '@/domain/assets/integrity';
import { ASSOCIATION_SLOTS, officeLogoSlot, type AssetSlot } from '@/domain/assets/slots';
import { LOCAL_OFFICES } from '@/domain/offices/offices';
import type { OfficialAsset } from '@/domain/types/assets';

export interface SlotStatus {
  readonly slot: AssetSlot;
  readonly asset?: OfficialAsset;
  readonly filled: boolean;
}

interface LibraryState {
  readonly ready: boolean;
  readonly slots: readonly AssetSlot[];
  readonly integrityIssues: readonly IntegrityIssue[];
  readonly assetsVersion: number;
  bootstrap: () => void;
  lookupAsset: (id: string) => OfficialAsset | undefined;
  lookupSlot: (id: string) => AssetSlot | undefined;
  slotStatuses: (officeId?: string) => readonly SlotStatus[];
  assetForSlot: (slotId: string) => OfficialAsset | undefined;
}

function allSlots(): readonly AssetSlot[] {
  return [...ASSOCIATION_SLOTS, ...LOCAL_OFFICES.map((office) => officeLogoSlot(office.id, office.name))];
}

/**
 * Loads the official asset library.
 *
 * `bundled-manifest` is one of only three mutation sources the registry accepts
 * — the others are a signed backend sync and an admin publish. There is no path
 * from an AI service into this store.
 */
export const useLibraryStore = create<LibraryState>((set, get) => ({
  ready: false,
  slots: allSlots(),
  integrityIssues: [],
  assetsVersion: 0,

  bootstrap: () => {
    assetRegistry.registerMany(BUNDLED_OFFICIAL_ASSETS, 'bundled-manifest');
    set({
      ready: true,
      integrityIssues: auditRegistry(assetRegistry.all()),
      assetsVersion: get().assetsVersion + 1,
    });
  },

  lookupAsset: (id) => assetRegistry.get(id),

  lookupSlot: (id) => get().slots.find((slot) => slot.id === id),

  assetForSlot: (slotId) => {
    const entry = BUNDLED_OFFICIAL_ASSETS.find((candidate) => candidate.fillsSlot === slotId);
    return entry ? assetRegistry.get(entry.id) : undefined;
  },

  slotStatuses: (officeId) => {
    const { slots, assetForSlot } = get();
    return slots
      .filter((slot) => !slot.officeId || !officeId || slot.officeId === officeId)
      .map((slot) => {
        const asset = assetForSlot(slot.id);
        return { slot, asset, filled: Boolean(asset?.approved) };
      });
  },
}));
