import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, OfficialAssetBadge, Text } from '@/components/ui';
import { isProtected, policySummary } from '@/domain/assets/policy';
import { isAssetBacked, type PosterElement } from '@/domain/types/elements';
import type { OfficialAsset } from '@/domain/types/assets';
import { colors, spacing } from '@/theme/theme';

export interface ElementInspectorProps {
  readonly visible: boolean;
  readonly element?: PosterElement;
  readonly asset?: OfficialAsset;
  readonly onClose: () => void;
  readonly onReplaceAsset: () => void;
  readonly onToggleVisible: () => void;
  readonly onToggleLock: () => void;
  readonly onDuplicate: () => void;
  readonly onEditContent?: () => void;
}

/**
 * Contextual controls for the selected element.
 *
 * When the element holds a protected official asset the panel leads with the
 * OFFICIAL ASSET badge and then states, item by item, what may and may not be
 * done to it. The restrictions are read from the asset policy rather than
 * hard-coded here, so the UI cannot drift from what the engine enforces.
 */
export function ElementInspector({
  visible,
  element,
  asset,
  onClose,
  onReplaceAsset,
  onToggleVisible,
  onToggleLock,
  onDuplicate,
  onEditContent,
}: ElementInspectorProps) {
  if (!element) return null;

  const protectedAsset = asset ? isProtected(asset) : false;
  const rows = asset ? policySummary(asset) : [];

  return (
    <BottomSheet visible={visible} title={element.name} subtitle={describe(element)} onClose={onClose}>
      {protectedAsset ? (
        <View style={styles.officialHeader}>
          <OfficialAssetBadge />
          <Text variant="caption" color={colors.inkSecondary}>
            {asset?.name} · version {asset?.version.toFixed(1)}
          </Text>
        </View>
      ) : null}

      {isAssetBacked(element) && !asset ? (
        <Banner
          tone="warning"
          title="Approved asset required."
          message="This frame is reserved for an official image that has not been installed yet."
        />
      ) : null}

      {rows.length > 0 ? (
        <View style={styles.policy}>
          {rows.map((row) => (
            <View key={row.label} style={styles.policyRow}>
              <Text variant="body" color={row.allowed ? colors.ink : colors.inkMuted}>
                {row.allowed ? '✓' : '✗'} {row.label}
              </Text>
              {row.note ? (
                <Text variant="caption" color={colors.inkMuted}>
                  {row.note}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        {isAssetBacked(element) ? (
          <Button label="Replace from approved library" variant="secondary" onPress={onReplaceAsset} />
        ) : null}
        {onEditContent ? <Button label="Edit the text" variant="secondary" onPress={onEditContent} /> : null}
        <Button label={element.visible ? 'Hide' : 'Show'} variant="secondary" onPress={onToggleVisible} />
        <Button
          label={element.locked ? 'Unlock' : 'Lock'}
          variant="secondary"
          onPress={onToggleLock}
          accessibilityHint="Locked items cannot be moved or resized."
        />
        <Button label="Duplicate" variant="secondary" onPress={onDuplicate} />
      </View>

      {protectedAsset ? (
        <Text variant="caption" color={colors.inkMuted}>
          Official assets can be moved, scaled proportionally and replaced with another approved asset. They are
          never stretched, recoloured, mirrored, stylised, background-removed, AI-enhanced or AI-regenerated.
        </Text>
      ) : null}
    </BottomSheet>
  );
}

function describe(element: PosterElement): string {
  const size = `${Math.round(element.frame.width)} × ${Math.round(element.frame.height)}`;
  return `${element.type.replace(/_/g, ' ').toLowerCase()} · ${size}`;
}

const styles = StyleSheet.create({
  officialHeader: { gap: spacing.xs },
  policy: { gap: spacing.xs },
  policyRow: { gap: 0 },
  actions: { gap: spacing.sm },
});
