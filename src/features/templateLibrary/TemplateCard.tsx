import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { findOffice } from '@/domain/offices/offices';
import { findEventType } from '@/domain/eventTypes/eventTypes';
import type { PosterTemplate } from '@/domain/types/template';
import { colors, spacing } from '@/theme/theme';
import { PosterThumbnail } from './PosterThumbnail';

export interface TemplateCardProps {
  readonly template: PosterTemplate;
  readonly onPress: () => void;
  readonly selected?: boolean;
}

export function TemplateCard({ template, onPress, selected }: TemplateCardProps) {
  const office = template.localOfficeId ? findOffice(template.localOfficeId) : undefined;
  const eventNames = template.eventTypes
    .map((id) => findEventType(id)?.name ?? id)
    .slice(0, 2)
    .join(' · ');

  return (
    <Card onPress={onPress} selected={selected} style={styles.card}>
      <View style={styles.row}>
        <PosterThumbnail templateId={template.id} width={92} />
        <View style={styles.details}>
          <Text variant="heading" numberOfLines={2}>
            {template.name}
          </Text>
          <Text variant="caption" color={colors.inkSecondary} numberOfLines={3}>
            {template.description}
          </Text>
          <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
            {office?.shortName ?? 'All offices'} · {eventNames || 'Any event'}
          </Text>
          <View style={styles.badges}>
            {template.official ? <Badge label="Official template" tone="official" /> : null}
            <Badge label={`Version ${template.version}`} tone="version" />
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  details: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
});
