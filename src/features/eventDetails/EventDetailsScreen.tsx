import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Field, Screen, SectionHeader, Text } from '@/components/ui';
import { AiAssistSheet } from './AiAssistSheet';
import { FelicitationEditor } from './FelicitationEditor';
import { GuestEditor } from './GuestEditor';
import { ProgrammeEditor } from './ProgrammeEditor';
import { findEventType } from '@/domain/eventTypes/eventTypes';
import { findOffice } from '@/domain/offices/offices';
import { templateRegistry } from '@/domain/templates/registry';
import { createPosterDocument } from '@/domain/poster/document';
import { SAMPLE_GURU_JAYANTI } from '@/domain/poster/sampleData';
import type { EventDetails } from '@/domain/types/content';
import { EMPTY_EVENT_DETAILS } from '@/domain/types/content';
import { usePosterStore } from '@/state/posterStore';
import { colors, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

/**
 * Step 5 of the flow: the content of the poster, entered as structured fields.
 *
 * Nothing typed here is positioned by hand. The template decides where each
 * field appears; this screen only decides what it says.
 */
export function EventDetailsScreen({ navigation, route }: ScreenProps<'EventDetails'>) {
  const { officeId, eventTypeId, templateId } = route.params;

  const office = findOffice(officeId);
  const eventType = findEventType(eventTypeId);
  const template = templateRegistry.get(templateId);

  const open = usePosterStore((state) => state.open);
  const save = usePosterStore((state) => state.save);

  const [details, setDetails] = useState<EventDetails>({
    ...EMPTY_EVENT_DETAILS,
    footerNote: office?.defaultFooter,
  });
  const [assistingTitle, setAssistingTitle] = useState(false);

  const context = useMemo(
    () => ({ eventTypeName: eventType?.name, officeName: office?.name }),
    [eventType, office],
  );

  if (!office || !template) {
    return (
      <Screen>
        <Banner tone="danger" title="This template is no longer available." message="Please choose another one." />
      </Screen>
    );
  }

  const patch = (update: Partial<EventDetails>): void => setDetails((current) => ({ ...current, ...update }));

  const proceed = async (): Promise<void> => {
    const document = createPosterDocument({
      template,
      office,
      eventTypeId,
      details,
      title: details.title || template.name,
    });
    open(document);
    await save();
    navigation.navigate('Editor', { posterId: document.id });
  };

  return (
    <Screen
      footer={
        <Button label="Open in editor" onPress={() => void proceed()} fullWidth disabled={!details.title.trim()} />
      }
    >
      <SectionHeader title="Event details" subtitle={`${office.shortName} · ${eventType?.name ?? ''}`} />

      <Field
        label="Event title"
        required
        placeholder="172nd Guru Jayanthi of Brahma Shree Narayana Guru Swami"
        value={details.title}
        onChangeText={(title) => patch({ title })}
        multiline
        accessory={<Button label="Assist" variant="ghost" onPress={() => setAssistingTitle(true)} />}
      />

      <Field
        label="Subtitle"
        placeholder="Organised by the Billawar Association Mumbai"
        value={details.subtitle ?? ''}
        onChangeText={(subtitle) => patch({ subtitle })}
      />

      <Field
        label="Date"
        required
        placeholder="Sunday, 13 September 2026 · 5.00 pm onwards"
        hint="Write it exactly as it should appear on the poster."
        value={details.dateLabel ?? ''}
        onChangeText={(dateLabel) => patch({ dateLabel })}
      />

      <Field
        label="Venue"
        required
        placeholder="Billawar Bhavan, Community Hall"
        value={details.venue?.name ?? ''}
        onChangeText={(name) => patch({ venue: { ...details.venue, name } })}
      />
      <Field
        label="Venue address"
        placeholder="Sector 14, Vashi, Navi Mumbai 400703"
        value={details.venue?.addressLine ?? ''}
        onChangeText={(addressLine) =>
          patch({ venue: { name: details.venue?.name ?? '', ...details.venue, addressLine } })
        }
      />

      {eventType?.sections.programme ? (
        <ProgrammeEditor items={details.programme} onChange={(programme) => patch({ programme })} />
      ) : null}

      {eventType?.sections.guests ? (
        <GuestEditor guests={details.guests} onChange={(guests) => patch({ guests })} />
      ) : null}

      {eventType?.sections.felicitation ? (
        <FelicitationEditor
          entries={details.felicitations}
          onChange={(felicitations) => patch({ felicitations })}
          context={context}
        />
      ) : null}

      <Field
        label="Footer message"
        value={details.footerNote ?? ''}
        onChangeText={(footerNote) => patch({ footerNote })}
      />

      <View style={styles.sample}>
        <Text variant="caption" color={colors.inkMuted}>
          Want to see how a full poster behaves before typing everything?
        </Text>
        <Button
          label="Fill with sample content"
          variant="secondary"
          onPress={() => setDetails(SAMPLE_GURU_JAYANTI)}
        />
      </View>

      <AiAssistSheet
        visible={assistingTitle}
        capability="suggestTitles"
        text={details.title}
        context={context}
        onClose={() => setAssistingTitle(false)}
        onApply={(title) => {
          patch({ title });
          setAssistingTitle(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sample: { gap: spacing.sm },
});
