import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/theme';
import { Text } from './Text';

type Tone = 'info' | 'warning' | 'danger' | 'success';

const TONES: Record<Tone, { background: string; foreground: string }> = {
  info: { background: colors.surfaceMuted, foreground: colors.inkSecondary },
  warning: { background: colors.warningSoft, foreground: colors.warning },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  success: { background: colors.successSoft, foreground: colors.success },
};

export interface BannerProps {
  readonly title: string;
  readonly message?: string;
  readonly tone?: Tone;
}

export function Banner({ title, message, tone = 'info' }: BannerProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.background }]}>
      <Text variant="bodyStrong" color={palette.foreground}>
        {title}
      </Text>
      {message ? (
        <Text variant="caption" color={palette.foreground}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: spacing.lg, borderRadius: radius.md, gap: 4 },
});
