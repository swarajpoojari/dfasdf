import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Field, SectionHeader, Text } from '@/components/ui';
import { AiAssistSheet } from './AiAssistSheet';
import type { FelicitationEntry } from '@/domain/types/content';
import { createId } from '@/utils/id';
import { colors, spacing } from '@/theme/theme';

export interface FelicitationEditorProps {
  readonly entries: readonly FelicitationEntry[];
  readonly onChange: (entries: readonly FelicitationEntry[]) => void;
  readonly context?: { eventTypeName?: string; officeName?: string };
}

/**
 * The felicitation section is the one that grows unpredictably, so this editor
 * makes the long form easy: a description, plus as many bullet points as the
 * citation needs. The layout engine re-flows the poster around whatever is
 * typed here — nothing is ever cut off silently.
 */
export function FelicitationEditor({ entries, onChange, context }: FelicitationEditorProps) {
  const [assisting, setAssisting] = useState<string>();

  const update = (id: string, patch: Partial<FelicitationEntry>): void =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));

  const active = entries.find((entry) => entry.id === assisting);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Felicitation"
        subtitle="Name, designation, and as much detail as the citation needs."
      />

      {entries.map((entry) => (
        <Card key={entry.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="overline" color={colors.accent}>
              Felicitation
            </Text>
            <Button
              label="Remove"
              variant="ghost"
              onPress={() => onChange(entries.filter((candidate) => candidate.id !== entry.id))}
            />
          </View>

          <Field
            label="Name"
            placeholder="Shri Rajesh Poojary"
            value={entry.name}
            onChangeText={(name) => update(entry.id, { name })}
          />
          <Field
            label="Designation"
            placeholder="Asst. Commissioner, GST"
            value={entry.designation}
            onChangeText={(designation) => update(entry.id, { designation })}
          />
          <Field
            label="Description (optional)"
            placeholder="For distinguished service in public administration."
            value={entry.description ?? ''}
            onChangeText={(description) => update(entry.id, { description })}
            multiline
            accessory={
              <Button label="Assist" variant="ghost" onPress={() => setAssisting(entry.id)} />
            }
          />

          <View style={styles.bullets}>
            <Text variant="bodyStrong">Bullet points</Text>
            {(entry.bullets ?? []).map((bullet, index) => (
              <View key={index} style={styles.bulletRow}>
                <Field
                  label={`Point ${index + 1}`}
                  value={bullet}
                  onChangeText={(value) =>
                    update(entry.id, {
                      bullets: (entry.bullets ?? []).map((existing, i) => (i === index ? value : existing)),
                    })
                  }
                  style={styles.grow}
                />
                <Button
                  label="Remove"
                  variant="ghost"
                  onPress={() =>
                    update(entry.id, { bullets: (entry.bullets ?? []).filter((_, i) => i !== index) })
                  }
                />
              </View>
            ))}
            <Button
              label="Add bullet point"
              variant="secondary"
              onPress={() => update(entry.id, { bullets: [...(entry.bullets ?? []), ''] })}
            />
          </View>
        </Card>
      ))}

      <Button
        label="Add person to felicitate"
        variant="secondary"
        onPress={() => onChange([...entries, { id: createId('fel'), name: '', designation: '' }])}
      />

      <AiAssistSheet
        visible={Boolean(active)}
        capability="shortenText"
        text={active?.description ?? ''}
        context={context}
        onClose={() => setAssisting(undefined)}
        onApply={(text) => {
          if (active) update(active.id, { description: text });
          setAssisting(undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bullets: { gap: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  grow: { flex: 1 },
});
