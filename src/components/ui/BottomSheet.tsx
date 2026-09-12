import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, motion, radius, spacing } from '@/theme/theme';
import { Text } from './Text';

export interface BottomSheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly subtitle?: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}

/**
 * A plain modal sheet. Contextual editing controls live in these rather than in
 * a permanently docked panel, so the poster keeps as much of the screen as
 * possible on a small phone.
 */
export function BottomSheet({ visible, title, subtitle, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: motion.normal });
  }, [visible, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 28 }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }, sheetStyle]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text variant="title">{title}</Text>
          {subtitle ? (
            <Text variant="caption" color={colors.inkMuted}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
    ...(elevation.sheet as object),
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  header: { gap: 2 },
});
