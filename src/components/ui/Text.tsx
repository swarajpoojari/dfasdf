import React from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography } from '@/theme/theme';

type Variant = keyof typeof typography;

export interface AppTextProps extends RNTextProps {
  readonly variant?: Variant;
  readonly color?: string;
  readonly center?: boolean;
}

export function Text({ variant = 'body', color = colors.ink, center, style, ...rest }: AppTextProps) {
  return <RNText {...rest} style={[styles[variant], { color }, center && styles.center, style]} />;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  display: typography.display,
  title: typography.title,
  heading: typography.heading,
  body: typography.body,
  bodyStrong: typography.bodyStrong,
  caption: typography.caption,
  overline: { ...typography.overline, textTransform: 'uppercase' },
});
