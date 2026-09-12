import React from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { colors, elevation, radius, spacing } from '@/theme/theme';

export interface CardProps extends ViewProps {
  readonly onPress?: () => void;
  readonly padded?: boolean;
  readonly selected?: boolean;
  readonly accessibilityLabel?: string;
}

export function Card({ onPress, padded = true, selected, style, children, ...rest }: CardProps) {
  const content = (
    <View
      {...rest}
      style={[styles.card, padded && styles.padded, selected && styles.selected, style]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...(elevation.card as object),
  },
  padded: { padding: spacing.lg },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
});
