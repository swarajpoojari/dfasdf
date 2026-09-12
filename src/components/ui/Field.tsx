import React from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/theme';
import { Text } from './Text';

export interface FieldProps extends TextInputProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly accessory?: React.ReactNode;
}

export function Field({ label, hint, error, required, accessory, style, ...rest }: FieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text variant="bodyStrong">
          {label}
          {required ? <Text color={colors.danger}> *</Text> : null}
        </Text>
        {accessory}
      </View>
      <TextInput
        {...rest}
        style={[styles.input, rest.multiline && styles.multiline, error && styles.inputError, style]}
        placeholderTextColor={colors.inkMuted}
        accessibilityLabel={label}
      />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={colors.inkMuted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.ink,
    ...typography.body,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
});
