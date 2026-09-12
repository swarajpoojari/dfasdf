import React, { useMemo } from 'react';

import { EmptyState, Screen, SectionHeader, Text } from '@/components/ui';
import { templateRegistry } from '@/domain/templates/registry';
import { findEventType } from '@/domain/eventTypes/eventTypes';
import { findOffice } from '@/domain/offices/offices';
import { colors } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';
import { TemplateCard } from './TemplateCard';

export function TemplateSelectScreen({ navigation, route }: ScreenProps<'TemplateSelect'>) {
  const { officeId, eventTypeId } = route.params;
  const office = findOffice(officeId);
  const eventType = findEventType(eventTypeId);

  const templates = useMemo(
    () => templateRegistry.query({ officeId, eventTypeId }),
    [officeId, eventTypeId],
  );

  const fallback = useMemo(() => templateRegistry.query({ officeId }), [officeId]);
  const shown = templates.length > 0 ? templates : fallback;

  return (
    <Screen>
      <SectionHeader
        title="Choose a template"
        subtitle={`${office?.shortName ?? ''}${eventType ? ` · ${eventType.name}` : ''}`}
      />

      {templates.length === 0 ? (
        <Text variant="caption" color={colors.inkMuted}>
          No template is published specifically for {eventType?.name ?? 'this event type'} yet — these general
          templates can be used instead.
        </Text>
      ) : null}

      {shown.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onPress={() =>
            navigation.navigate('EventDetails', { officeId, eventTypeId, templateId: template.id })
          }
        />
      ))}

      {shown.length === 0 ? (
        <EmptyState
          title="No templates available"
          message="This office has no published templates yet. Please contact the association office."
        />
      ) : null}
    </Screen>
  );
}
