import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Field, SectionHeader, Text } from '@/components/ui';
import { GUEST_ROLE_LABELS, GUEST_ROLE_ORDER, type GuestEntry, type GuestRole } from '@/domain/types/content';
import { createId } from '@/utils/id';
import { colors, spacing } from '@/theme/theme';

export interface GuestEditorProps {
  readonly guests: readonly GuestEntry[];
  readonly onChange: (guests: readonly GuestEntry[]) => void;
}

export function GuestEditor({ guests, onChange }: GuestEditorProps) {
  const update = (id: string, patch: Partial<GuestEntry>): void =>
    onChange(guests.map((guest) => (guest.id === id ? { ...guest, ...patch } : guest)));

  return (
    <View style={styles.container}>
      <SectionHeader title="Guests" subtitle="Grouped on the poster by role, in the association's usual order." />

      {guests.map((guest) => (
        <Card key={guest.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="overline" color={colors.accent}>
              {GUEST_ROLE_LABELS[guest.role]}
            </Text>
            <Button
              label="Remove"
              variant="ghost"
              onPress={() => onChange(guests.filter((candidate) => candidate.id !== guest.id))}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {GUEST_ROLE_ORDER.map((role) => (
              <Chip
                key={role}
                label={GUEST_ROLE_LABELS[role]}
                selected={guest.role === role}
                onPress={() => update(guest.id, { role })}
              />
            ))}
          </ScrollView>

          <Field
            label="Name"
            placeholder="Dharmadarshi Ramesh M. Poojary"
            value={guest.name}
            onChangeText={(name) => update(guest.id, { name })}
          />
          <Field
            label="Designation (optional)"
            placeholder="President, Billawar Association Mumbai"
            value={guest.designation ?? ''}
            onChangeText={(designation) => update(guest.id, { designation })}
          />
        </Card>
      ))}

      <Button
        label="Add guest"
        variant="secondary"
        onPress={() => onChange([...guests, { id: createId('guest'), role: nextRole(guests), name: '' }])}
      />
    </View>
  );
}

/** Suggests the role the user is most likely to add next. */
function nextRole(guests: readonly GuestEntry[]): GuestRole {
  const used = new Set(guests.map((guest) => guest.role));
  return GUEST_ROLE_ORDER.find((role) => !used.has(role)) ?? 'GUEST';
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
});
