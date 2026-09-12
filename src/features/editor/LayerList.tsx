import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { isAssetBacked, type PosterElement } from '@/domain/types/elements';
import { colors, spacing } from '@/theme/theme';

export interface LayerListProps {
  readonly elements: readonly PosterElement[];
  readonly selectedId?: string;
  readonly onSelect: (elementId: string) => void;
}

export function LayerList({ elements, selectedId, onSelect }: LayerListProps) {
  const ordered = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ordered.map((element) => (
        <Card
          key={element.id}
          onPress={() => onSelect(element.id)}
          selected={element.id === selectedId}
          style={styles.chip}
        >
          <Text variant="caption" numberOfLines={1} color={element.visible ? colors.ink : colors.inkMuted}>
            {element.name}
          </Text>
          {element.locked ? <Badge label="Locked" tone="neutral" /> : null}
          {isAssetBacked(element) && !element.assetId ? <Badge label="Empty" tone="warning" /> : null}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, maxWidth: 190 },
});
