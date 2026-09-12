import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Banner, Button, Card, Screen, SectionHeader, Text } from '@/components/ui';
import { summariseReport } from '@/domain/validation/engine';
import { usePosterStore } from '@/state/posterStore';
import { colors, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

/**
 * POSTER CHECK
 *
 * The list a member sees before sharing. Errors block export outright — an
 * association poster with a missing logo or a clipped name cannot be unsent
 * once it is on WhatsApp.
 */
export function PosterCheckScreen({ navigation, route }: ScreenProps<'PosterCheck'>) {
  const report = usePosterStore((state) => state.report);
  const runAutoFix = usePosterStore((state) => state.runAutoFix);

  if (!report) {
    return (
      <Screen>
        <Banner tone="info" title="Open a poster to run the check." />
      </Screen>
    );
  }

  const failing = report.findings;

  return (
    <Screen
      footer={
        <Button
          label={report.canExport ? 'Continue to preview' : 'Fix the problems above'}
          onPress={() => navigation.navigate('Preview', { posterId: route.params.posterId })}
          disabled={!report.canExport}
          fullWidth
        />
      }
    >
      <SectionHeader title="Poster check" subtitle={summariseReport(report)} />

      <Card>
        {report.checks.map((check) => (
          <View key={check.ruleId} style={styles.checkRow}>
            <Text variant="body" color={check.passed ? colors.success : colors.danger}>
              {check.passed ? '✓' : check.severity === 'error' ? '✗' : '⚠'}
            </Text>
            <Text variant="body" color={check.passed ? colors.ink : colors.inkSecondary} style={styles.grow}>
              {check.title}
            </Text>
            {!check.passed ? (
              <Badge label={check.severity === 'error' ? 'Must fix' : 'Check'} tone={check.severity === 'error' ? 'danger' : 'warning'} />
            ) : null}
          </View>
        ))}
      </Card>

      {failing.length > 0 ? <SectionHeader title="What needs attention" /> : null}

      {failing.map((finding, index) => (
        <Card key={`${finding.ruleId}-${index}`} style={styles.finding}>
          <Badge
            label={finding.severity === 'error' ? 'Must fix before export' : 'Suggestion'}
            tone={finding.severity === 'error' ? 'danger' : 'warning'}
          />
          <Text variant="bodyStrong">{finding.title}</Text>
          <Text variant="body" color={colors.inkSecondary}>
            {finding.message}
          </Text>
          {finding.autoFix ? (
            <>
              <Text variant="caption" color={colors.inkMuted}>
                {finding.autoFix.description}
              </Text>
              <Button
                label={finding.autoFix.label}
                variant="secondary"
                onPress={() => runAutoFix(finding.autoFix!)}
              />
            </>
          ) : null}
        </Card>
      ))}

      {failing.length === 0 ? (
        <Banner tone="success" title="Every check passed" message="This poster is ready to be shared." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  grow: { flex: 1 },
  finding: { gap: spacing.sm },
});
