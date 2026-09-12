import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Banner, Button, Card, Chip, ProgressOverlay, Screen, SectionHeader, Text } from '@/components/ui';
import { EXPORT_SCALES } from '@/domain/types/canvas';
import { exportPoster, sharePoster } from '@/domain/export/exportService';
import type { ExportFormat, ExportResult } from '@/domain/export/types';
import { duplicateDocument } from '@/domain/poster/document';
import { findOffice } from '@/domain/offices/offices';
import { usePosterResources } from '@/renderer/usePosterResources';
import { usePosterStore } from '@/state/posterStore';
import { posterRepository } from '@/storage/posterRepository';
import { toUserMessage } from '@/utils/errors';
import { colors, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

const FORMATS: readonly { id: ExportFormat; label: string; hint: string }[] = [
  { id: 'jpeg', label: 'JPEG', hint: 'Best for WhatsApp — smaller file' },
  { id: 'png', label: 'PNG', hint: 'Sharpest text, larger file' },
  { id: 'pdf', label: 'PDF', hint: 'For printing' },
];

export function ExportScreen({ navigation }: ScreenProps<'Export'>) {
  const document = usePosterStore((state) => state.document);
  const layout = usePosterStore((state) => state.layout);
  const report = usePosterStore((state) => state.report);
  const open = usePosterStore((state) => state.open);
  const { resources } = usePosterResources(layout);

  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [scaleIndex, setScaleIndex] = useState(0);
  const [progress, setProgress] = useState<string>();
  const [result, setResult] = useState<ExportResult>();
  const [error, setError] = useState<string>();

  const office = document ? findOffice(document.localOfficeId) : undefined;
  const blocked = !report?.canExport;

  const run = async (): Promise<void> => {
    if (!document || !layout || !resources) return;
    if (blocked) {
      setError('This poster has problems that must be fixed before it can be exported.');
      return;
    }

    setError(undefined);
    try {
      const exported = await exportPoster({
        layout,
        resources,
        request: { format, scale: EXPORT_SCALES[scaleIndex]?.scale ?? 1 },
        title: document.title,
        officeName: office?.shortName ?? 'billawar',
        onProgress: ({ message }) => setProgress(message),
      });
      setResult(exported);
      await posterRepository.save({
        ...document,
        status: 'exported',
        lastExportedAt: new Date().toISOString(),
      });
    } catch (caught) {
      const { message, remedy } = toUserMessage(caught);
      setError(remedy ? `${message} ${remedy}` : message);
    } finally {
      setProgress(undefined);
    }
  };

  const share = async (): Promise<void> => {
    if (!result) return;
    try {
      await sharePoster(result);
    } catch (caught) {
      setError(toUserMessage(caught).message);
    }
  };

  const duplicate = async (): Promise<void> => {
    if (!document) return;
    const copy = duplicateDocument(document);
    await posterRepository.save(copy);
    open(copy);
    navigation.navigate('Editor', { posterId: copy.id });
  };

  return (
    <Screen
      footer={
        result ? (
          <Button label="Share" onPress={() => void share()} fullWidth />
        ) : (
          <Button label="Export poster" onPress={() => void run()} disabled={blocked} fullWidth />
        )
      }
    >
      <SectionHeader title="Export" subtitle={document?.title} />

      {blocked ? (
        <Banner
          tone="danger"
          title="Not ready to export"
          message="Go back to the poster check and resolve the problems listed there."
        />
      ) : null}

      {error ? <Banner tone="danger" title="Export did not finish" message={error} /> : null}

      <Card>
        <Text variant="bodyStrong">Format</Text>
        <View style={styles.row}>
          {FORMATS.map((entry) => (
            <Chip key={entry.id} label={entry.label} selected={format === entry.id} onPress={() => setFormat(entry.id)} />
          ))}
        </View>
        <Text variant="caption" color={colors.inkMuted}>
          {FORMATS.find((entry) => entry.id === format)?.hint}
        </Text>
      </Card>

      <Card>
        <Text variant="bodyStrong">Size</Text>
        <View style={styles.column}>
          {EXPORT_SCALES.map((entry, index) => (
            <Chip
              key={entry.label}
              label={entry.label}
              selected={scaleIndex === index}
              onPress={() => setScaleIndex(index)}
            />
          ))}
        </View>
      </Card>

      {result ? (
        <Card>
          <Badge label="Poster exported successfully" tone="approved" />
          <Text variant="bodyStrong">{result.fileName}</Text>
          <Text variant="caption" color={colors.inkMuted}>
            {result.width} × {result.height} pixels · {(result.bytes / 1024).toFixed(0)} KB
          </Text>
          <Button label="Duplicate as new poster" variant="secondary" onPress={() => void duplicate()} />
        </Card>
      ) : null}

      <Text variant="caption" color={colors.inkMuted}>
        Exports are rendered from the poster’s design grid, so the official logo and approved images keep their full
        quality and their exact proportions.
      </Text>

      <ProgressOverlay visible={Boolean(progress)} message={progress ?? ''} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  column: { gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' },
});
