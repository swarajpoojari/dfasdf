import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Screen, SectionHeader, Text } from '@/components/ui';
import { AssetCard } from './AssetCard';
import { useLibraryStore } from '@/state/libraryStore';
import type { AssetCategory } from '@/domain/types/assets';
import { colors, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

const SECTION_TITLES: Partial<Record<AssetCategory, string>> = {
  ASSOCIATION_LOGO: 'Association logos',
  LOCAL_OFFICE_LOGO: 'Local office branding',
  GURU_IMAGE: 'Guru images',
  KOTI_CHENNAYA_IMAGE: 'Koti-Chennaya',
  TEMPLE_IMAGE: 'Temple images',
  OFFICIAL_PHOTO: 'Official photographs',
  DECORATION: 'Decorations',
};

const SECTION_ORDER: readonly AssetCategory[] = [
  'ASSOCIATION_LOGO',
  'LOCAL_OFFICE_LOGO',
  'GURU_IMAGE',
  'KOTI_CHENNAYA_IMAGE',
  'TEMPLE_IMAGE',
  'OFFICIAL_PHOTO',
  'DECORATION',
];

export function AssetLibraryScreen({ route }: ScreenProps<'AssetLibrary'>) {
  const officeId = route.params?.officeId;
  const slotStatuses = useLibraryStore((state) => state.slotStatuses);
  const integrityIssues = useLibraryStore((state) => state.integrityIssues);

  const statuses = slotStatuses(officeId);
  const missing = statuses.filter((status) => !status.filled).length;

  const sections = useMemo(
    () =>
      SECTION_ORDER.map((category) => ({
        category,
        title: SECTION_TITLES[category] ?? category,
        entries: statuses.filter((status) => status.slot.category === category),
      })).filter((section) => section.entries.length > 0),
    [statuses],
  );

  return (
    <Screen>
      <SectionHeader
        title="Official Asset Library"
        subtitle="Supplied and approved by the association. Used exactly as given."
      />

      <Banner
        tone={missing > 0 ? 'warning' : 'success'}
        title={
          missing > 0
            ? `${missing} asset${missing === 1 ? '' : 's'} still to be installed`
            : 'All official assets are installed'
        }
        message="These files are never generated, redrawn, recoloured, stretched or AI-enhanced. When one is missing the app says “Approved asset required” rather than inventing a substitute."
      />

      {integrityIssues.length > 0 ? (
        <Banner
          tone="danger"
          title="Some assets failed their integrity check"
          message={integrityIssues.map((issue) => `${issue.assetName}: ${issue.reason}`).join('\n')}
        />
      ) : null}

      {sections.map((section) => (
        <View key={section.category} style={styles.section}>
          <SectionHeader title={section.title} />
          {section.entries.map((status) => (
            <AssetCard key={status.slot.id} slot={status.slot} asset={status.asset} />
          ))}
        </View>
      ))}

      <Text variant="caption" color={colors.inkMuted}>
        To install or update an asset, the association publishes it from the admin panel. See
        docs/ASSET_REPLACEMENT.md for the developer steps.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
});
