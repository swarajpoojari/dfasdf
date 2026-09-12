import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge, Card, Screen, SectionHeader, Text } from '@/components/ui';
import { activeOffices, officeNeedsConfiguration } from '@/domain/offices/offices';
import { colors, motion, radius, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

export function OfficeSelectScreen({ navigation }: ScreenProps<'OfficeSelect'>) {
  const offices = activeOffices();

  return (
    <Screen>
      <SectionHeader title="Which local office?" subtitle="The poster header and footer come from this choice." />

      {offices.map((office, index) => (
        <Animated.View key={office.id} entering={FadeInDown.delay(index * motion.stagger).duration(motion.normal)}>
          <Card onPress={() => navigation.navigate('EventTypeSelect', { officeId: office.id })}>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: office.accentColor }]} />
              <View style={styles.grow}>
                <Text variant="heading">{office.name}</Text>
                <Text variant="caption" color={colors.inkMuted} numberOfLines={2}>
                  {office.address}
                </Text>
              </View>
              {officeNeedsConfiguration(office) ? <Badge label="Setup needed" tone="warning" /> : null}
            </View>
          </Card>
        </Animated.View>
      ))}

      <Text variant="caption" color={colors.inkMuted}>
        More local offices can be added by the association without a new version of the app.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  grow: { flex: 1, gap: 2 },
});
