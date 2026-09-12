import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import type { OfficialAsset } from '@/domain/types/assets';
import { isProtected } from '@/domain/assets/policy';
import type { AssetSlot } from '@/domain/assets/slots';
import { APPROVED_ASSET_REQUIRED } from '@/domain/assets/slots';
import { colors, radius, spacing } from '@/theme/theme';

export interface AssetCardProps {
  readonly slot: AssetSlot;
  readonly asset?: OfficialAsset;
  readonly onPress?: () => void;
  readonly selected?: boolean;
}

/**
 * One row of the Official Asset Library.
 *
 * A filled slot shows OFFICIAL / APPROVED / VERSION so members can see these
 * are authoritative files. An unfilled slot says "Approved asset required."
 * and nothing else — there is no stand-in image to look at, by design.
 */
export function AssetCard({ slot, asset, onPress, selected }: AssetCardProps) {
  const filled = Boolean(asset?.approved);

  return (
    <Card onPress={onPress} selected={selected} style={styles.card}>
      <View style={[styles.swatch, filled ? styles.swatchFilled : styles.swatchEmpty]}>
        <Text variant="overline" center color={filled ? colors.primary : colors.inkMuted}>
          {filled ? 'Official' : 'Empty'}
        </Text>
      </View>

      <View style={styles.details}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {asset?.name ?? slot.label}
        </Text>
        <Text variant="caption" color={colors.inkMuted} numberOfLines={3}>
          {filled ? slot.guidance : `${APPROVED_ASSET_REQUIRED} ${slot.guidance}`}
        </Text>

        <View style={styles.badges}>
          {filled ? (
            <>
              <Badge label="Official" tone="official" />
              <Badge label="Approved" tone="approved" />
              <Badge label={`Version ${asset?.version.toFixed(1)}`} tone="version" />
              {asset && isProtected(asset) ? <Badge label="Protected" tone="neutral" /> : null}
            </>
          ) : (
            <>
              <Badge label={slot.required ? 'Required' : 'Optional'} tone={slot.required ? 'danger' : 'neutral'} />
              <Badge label="Not installed" tone="warning" />
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  swatch: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  swatchFilled: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  swatchEmpty: { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderStyle: 'dashed' },
  details: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
});
