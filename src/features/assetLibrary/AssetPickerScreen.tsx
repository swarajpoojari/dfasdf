import React from 'react';

import { Banner, Screen, SectionHeader } from '@/components/ui';
import { AssetCard } from './AssetCard';
import { replaceAsset } from '@/domain/poster/operations';
import { isAssetBacked } from '@/domain/types/elements';
import { useLibraryStore } from '@/state/libraryStore';
import { usePosterStore } from '@/state/posterStore';
import type { ScreenProps } from '@/navigation/types';

/**
 * Choosing an image for a frame.
 *
 * Every option here comes from the approved library. There is no "upload your
 * own" and no "generate one" — a member who needs a new image asks the
 * association to approve and publish it.
 */
export function AssetPickerScreen({ navigation, route }: ScreenProps<'AssetPicker'>) {
  const { elementId, officeId } = route.params;

  const document = usePosterStore((state) => state.document);
  const commit = usePosterStore((state) => state.commit);
  const notify = usePosterStore((state) => state.notify);
  const lookupAsset = useLibraryStore((state) => state.lookupAsset);
  const lookupSlot = useLibraryStore((state) => state.lookupSlot);
  const slotStatuses = useLibraryStore((state) => state.slotStatuses);

  const element = document?.elements.find((candidate) => candidate.id === elementId);

  // Offer assets of the same kind as the frame expects: a logo frame lists
  // logos, a Guru frame lists approved Guru images. Category is taken from the
  // slot the template reserved, so it stays right as templates change.
  const slotId = element && isAssetBacked(element) ? element.slotId : undefined;
  const category = slotId ? lookupSlot(slotId)?.category : undefined;
  const statuses = slotStatuses(officeId).filter((status) =>
    category ? status.slot.category === category : true,
  );

  const choose = (assetId: string): void => {
    if (!document) return;
    const asset = lookupAsset(assetId);
    if (!asset) {
      notify('That image is no longer available. Please choose another approved image.');
      return;
    }
    const result = replaceAsset(document, elementId, asset, { lookupAsset });
    if (result.ok) {
      commit(result.value);
      navigation.goBack();
    } else {
      notify(result.error);
    }
  };

  return (
    <Screen>
      <SectionHeader
        title="Choose an approved image"
        subtitle={element ? `For “${element.name}”` : undefined}
      />

      <Banner
        tone="info"
        title="Only approved assets can be placed on a poster"
        message="The association publishes these files. They are used exactly as supplied — never generated, redrawn or enhanced."
      />

      {statuses.map((status) => (
        <AssetCard
          key={status.slot.id}
          slot={status.slot}
          asset={status.asset}
          onPress={status.asset ? () => choose(status.asset!.id) : undefined}
        />
      ))}
    </Screen>
  );
}
