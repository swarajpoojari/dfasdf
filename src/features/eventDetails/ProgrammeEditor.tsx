import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Field, SectionHeader, Text } from '@/components/ui';
import type { ProgrammeItem } from '@/domain/types/content';
import { createId } from '@/utils/id';
import { colors, spacing } from '@/theme/theme';

export interface ProgrammeEditorProps {
  readonly items: readonly ProgrammeItem[];
  readonly onChange: (items: readonly ProgrammeItem[]) => void;
}

export function ProgrammeEditor({ items, onChange }: ProgrammeEditorProps) {
  const update = (id: string, patch: Partial<ProgrammeItem>): void =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  return (
    <View style={styles.container}>
      <SectionHeader title="Programme" subtitle="Times appear in a column beside each item." />

      {items.map((item, index) => (
        <Card key={item.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="overline" color={colors.accent}>
              Item {index + 1}
            </Text>
            <Button
              label="Remove"
              variant="ghost"
              onPress={() => onChange(items.filter((candidate) => candidate.id !== item.id))}
            />
          </View>
          <Field
            label="Time"
            placeholder="5.00 pm"
            value={item.time}
            onChangeText={(time) => update(item.id, { time })}
          />
          <Field
            label="Item"
            placeholder="Deepa Prajwalana and Guru Vandana"
            value={item.title}
            onChangeText={(title) => update(item.id, { title })}
          />
          <Field
            label="Detail (optional)"
            placeholder="Presented by the Youth Wing"
            value={item.detail ?? ''}
            onChangeText={(detail) => update(item.id, { detail })}
          />
        </Card>
      ))}

      <Button
        label="Add programme item"
        variant="secondary"
        onPress={() => onChange([...items, { id: createId('prog'), time: '', title: '' }])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
