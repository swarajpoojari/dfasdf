import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/theme';
import { Text } from './Text';

export interface ProgressOverlayProps {
  readonly visible: boolean;
  readonly message: string;
}

export function ProgressOverlay({ visible, message }: ProgressOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyStrong" center>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    minWidth: 240,
    alignItems: 'center',
  },
});
