import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme/theme';
import { Text } from './Text';

export interface ChipProps {
  readonly label: string;
  readonly selected?: boolean;
  readonly onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text variant="caption" color={selected ? colors.white : colors.inkSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
