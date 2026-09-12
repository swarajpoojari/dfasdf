import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip, EmptyState, Field, Screen, SectionHeader } from '@/components/ui';
import { activeEventTypes } from '@/domain/eventTypes/eventTypes';
import { activeOffices } from '@/domain/offices/offices';
import { templateRegistry } from '@/domain/templates/registry';
import type { TemplateLanguage } from '@/domain/types/template';
import { spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';
import { TemplateCard } from './TemplateCard';

const LANGUAGES: readonly { id: TemplateLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'mr', label: 'मराठी' },
  { id: 'kn', label: 'ಕನ್ನಡ' },
];

/** The visual template browser: filter by office, event type, language. */
export function TemplateLibraryScreen({ navigation, route }: ScreenProps<'TemplateLibrary'>) {
  const [officeId, setOfficeId] = useState<string | undefined>(route.params?.officeId);
  const [eventTypeId, setEventTypeId] = useState<string>();
  const [language, setLanguage] = useState<TemplateLanguage>();
  const [officialOnly, setOfficialOnly] = useState(true);
  const [search, setSearch] = useState('');

  const templates = useMemo(
    () => templateRegistry.query({ officeId, eventTypeId, language, officialOnly, search }),
    [officeId, eventTypeId, language, officialOnly, search],
  );

  return (
    <Screen>
      <SectionHeader title="Template library" subtitle={`${templates.length} template(s)`} />

      <Field label="Search" placeholder="Template name" value={search} onChangeText={setSearch} />

      <FilterRow label="Office">
        <Chip label="All" selected={!officeId} onPress={() => setOfficeId(undefined)} />
        {activeOffices().map((office) => (
          <Chip
            key={office.id}
            label={office.shortName}
            selected={officeId === office.id}
            onPress={() => setOfficeId(officeId === office.id ? undefined : office.id)}
          />
        ))}
      </FilterRow>

      <FilterRow label="Event type">
        <Chip label="All" selected={!eventTypeId} onPress={() => setEventTypeId(undefined)} />
        {activeEventTypes().map((eventType) => (
          <Chip
            key={eventType.id}
            label={eventType.name}
            selected={eventTypeId === eventType.id}
            onPress={() => setEventTypeId(eventTypeId === eventType.id ? undefined : eventType.id)}
          />
        ))}
      </FilterRow>

      <FilterRow label="Language">
        <Chip label="Any" selected={!language} onPress={() => setLanguage(undefined)} />
        {LANGUAGES.map((entry) => (
          <Chip
            key={entry.id}
            label={entry.label}
            selected={language === entry.id}
            onPress={() => setLanguage(language === entry.id ? undefined : entry.id)}
          />
        ))}
        <Chip
          label="Official only"
          selected={officialOnly}
          onPress={() => setOfficialOnly((value) => !value)}
        />
      </FilterRow>

      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onPress={() =>
            navigation.navigate('TemplateSelect', {
              officeId: officeId ?? template.localOfficeId ?? activeOffices()[0]?.id ?? '',
              eventTypeId: eventTypeId ?? template.eventTypes[0] ?? 'general-announcement',
            })
          }
        />
      ))}

      {templates.length === 0 ? (
        <EmptyState title="Nothing matches those filters" message="Try clearing a filter or changing the search." />
      ) : null}
    </Screen>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filter}>
      <SectionHeader title={label} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filter: { gap: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
});
