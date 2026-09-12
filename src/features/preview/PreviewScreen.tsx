import React from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Banner, Button, Screen, SectionHeader, Text } from '@/components/ui';
import { PosterCanvas } from '@/renderer/PosterCanvas';
import { usePosterResources } from '@/renderer/usePosterResources';
import { usePosterStore } from '@/state/posterStore';
import { colors, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

export function PreviewScreen({ navigation, route }: ScreenProps<'Preview'>) {
  const { width } = useWindowDimensions();
  const layout = usePosterStore((state) => state.layout);
  const report = usePosterStore((state) => state.report);
  const { resources, loading, error } = usePosterResources(layout);

  const canvasWidth = Math.min(width - spacing.lg * 2, 520);

  return (
    <Screen
      footer={
        <Button
          label="Export and share"
          onPress={() => navigation.navigate('Export', { posterId: route.params.posterId })}
          disabled={!report?.canExport}
          fullWidth
        />
      }
    >
      <SectionHeader title="Preview" subtitle="Exactly what will be exported." />

      {error ? <Banner tone="danger" title="This poster could not be drawn" message={error} /> : null}

      {report && !report.canExport ? (
        <Banner
          tone="danger"
          title="This poster is not ready yet"
          message="Go back to the poster check — the problems listed there must be fixed first."
        />
      ) : null}

      <View style={styles.stage}>
        {loading || !layout || !resources ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <PosterCanvas layout={layout} resources={resources} width={canvasWidth} />
        )}
      </View>

      <Text variant="caption" color={colors.inkMuted}>
        The exported file is drawn from the poster’s own 1080 × 1536 design grid at full resolution — it is not a
        screenshot of this preview.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingVertical: spacing.md },
});
