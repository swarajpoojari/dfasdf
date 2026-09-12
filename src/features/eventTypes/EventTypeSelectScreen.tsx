import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card, Field, Screen, SectionHeader, Text } from '@/components/ui';
import { activeEventTypes } from '@/domain/eventTypes/eventTypes';
import { findOffice } from '@/domain/offices/offices';
import { colors, motion, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

export function EventTypeSelectScreen({ navigation, route }: ScreenProps<'EventTypeSelect'>) {
  const { officeId } = route.params;
  const office = findOffice(officeId);
  const [search, setSearch] = useState('');

  const eventTypes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return activeEventTypes().filter(
      (eventType) =>
        !needle ||
        eventType.name.toLowerCase().includes(needle) ||
        eventType.description.toLowerCase().includes(needle),
    );
  }, [search]);

  return (
    <Screen>
      <SectionHeader title="What kind of event?" subtitle={office?.name} />

      <Field
        label="Search"
        placeholder="Guru Jayanti, felicitation, blood donation…"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />

      <View style={styles.grid}>
        {eventTypes.map((eventType) => (
          <Animated.View key={eventType.id} entering={FadeIn.duration(motion.fast)} style={styles.cell}>
            <Card
              onPress={() => navigation.navigate('TemplateSelect', { officeId, eventTypeId: eventType.id })}
              style={styles.card}
            >
              <Text variant="bodyStrong" numberOfLines={2}>
                {eventType.name}
              </Text>
              {eventType.nameLocal ? (
                <Text variant="caption" color={colors.accent}>
                  {eventType.nameLocal}
                </Text>
              ) : null}
              <Text variant="caption" color={colors.inkMuted} numberOfLines={3}>
                {eventType.description}
              </Text>
            </Card>
          </Animated.View>
        ))}
      </View>

      {eventTypes.length === 0 ? (
        <Text variant="body" color={colors.inkSecondary}>
          No event type matches “{search}”.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '48%', flexGrow: 1 },
  card: { gap: spacing.xs, minHeight: 120 },
});
