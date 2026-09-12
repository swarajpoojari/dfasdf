import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { usePosterStore } from '@/state/posterStore';
import { colors, spacing } from '@/theme/theme';

export interface EditorToolbarProps {
  readonly onCheck: () => void;
  readonly onPreview: () => void;
  readonly errorCount: number;
}

export function EditorToolbar({ onCheck, onPreview, errorCount }: EditorToolbarProps) {
  const undo = usePosterStore((state) => state.undo);
  const redo = usePosterStore((state) => state.redo);
  const canUndo = usePosterStore((state) => state.canUndo());
  const canRedo = usePosterStore((state) => state.canRedo());
  const previewMode = usePosterStore((state) => state.previewMode);
  const setPreviewMode = usePosterStore((state) => state.setPreviewMode);
  const snapToGrid = usePosterStore((state) => state.snapToGrid);
  const setSnapToGrid = usePosterStore((state) => state.setSnapToGrid);

  return (
    <View style={styles.bar}>
      <ToolbarButton label="Undo" onPress={undo} disabled={!canUndo} />
      <ToolbarButton label="Redo" onPress={redo} disabled={!canRedo} />
      <ToolbarButton label={snapToGrid ? 'Snap on' : 'Snap off'} onPress={() => setSnapToGrid(!snapToGrid)} />
      <ToolbarButton label={previewMode ? 'Editing' : 'Preview'} onPress={() => setPreviewMode(!previewMode)} />
      <View style={styles.spacer} />
      <Pressable onPress={onCheck} accessibilityRole="button" style={styles.check}>
        <Text variant="bodyStrong" color={errorCount > 0 ? colors.danger : colors.success}>
          Check
        </Text>
        {errorCount > 0 ? <Badge label={String(errorCount)} tone="danger" /> : null}
      </Pressable>
      <ToolbarButton label="Share" onPress={onPreview} emphasis />
    </View>
  );
}

function ToolbarButton({
  label,
  onPress,
  disabled,
  emphasis,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text variant="caption" color={emphasis ? colors.primary : colors.inkSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  button: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  spacer: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
});
