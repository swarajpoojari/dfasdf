import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/theme';
import { Text } from './Text';

type Tone = 'official' | 'approved' | 'neutral' | 'warning' | 'danger' | 'version';

const TONES: Record<Tone, { background: string; foreground: string }> = {
  official: { background: colors.primary, foreground: colors.white },
  approved: { background: colors.successSoft, foreground: colors.success },
  neutral: { background: colors.surfaceMuted, foreground: colors.inkSecondary },
  warning: { background: colors.warningSoft, foreground: colors.warning },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  version: { background: colors.accentSoft, foreground: colors.accent },
};

export interface BadgeProps {
  readonly label: string;
  readonly tone?: Tone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text variant="overline" color={palette.foreground}>
        {label}
      </Text>
    </View>
  );
}

/** The badge shown wherever a protected official asset is being edited. */
export function OfficialAssetBadge() {
  return <Badge label="Official asset" tone="official" />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
});
