import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

import { Badge, Banner, Button, Card, Screen, SectionHeader, Text } from '@/components/ui';
import { activeOffices, ASSOCIATION_NAME } from '@/domain/offices/offices';
import { findEventType } from '@/domain/eventTypes/eventTypes';
import { templateRegistry } from '@/domain/templates/registry';
import { useDraftsStore } from '@/state/draftsStore';
import { useLibraryStore } from '@/state/libraryStore';
import { colors, motion, radius, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';
import { PosterThumbnail } from '@/features/templateLibrary/PosterThumbnail';

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const posters = useDraftsStore((state) => state.posters);
  const refresh = useDraftsStore((state) => state.refresh);
  const latestDraft = useDraftsStore((state) => state.latestDraft);
  const slotStatuses = useLibraryStore((state) => state.slotStatuses);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const offices = activeOffices();
  const templates = templateRegistry.query({ officialOnly: true }).slice(0, 6);
  const draft = latestDraft();

  const missingRequired = slotStatuses().filter((status) => status.slot.required && !status.filled);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(motion.slow)} style={styles.hero}>
        <Text variant="overline" color={colors.accent}>
          {ASSOCIATION_NAME}
        </Text>
        <Text variant="display">Poster Studio</Text>
        <Text variant="body" color={colors.inkSecondary}>
          Create official posters for the association and its local offices.
        </Text>
        <Button label="Create New Poster" onPress={() => navigation.navigate('OfficeSelect')} fullWidth />
      </Animated.View>

      {missingRequired.length > 0 ? (
        <Banner
          tone="warning"
          title="Official assets are not installed yet"
          message={`${missingRequired.length} required item${missingRequired.length === 1 ? '' : 's'} — including ${missingRequired[0]?.slot.label} — must be supplied by the association before a poster can be exported.`}
        />
      ) : null}

      {draft ? (
        <Card onPress={() => navigation.navigate('Editor', { posterId: draft.id })}>
          <View style={styles.rowBetween}>
            <View style={styles.grow}>
              <Text variant="overline" color={colors.accent}>
                Continue draft
              </Text>
              <Text variant="heading" numberOfLines={1}>
                {draft.title}
              </Text>
              <Text variant="caption" color={colors.inkMuted}>
                Last edited {formatWhen(draft.updatedAt)}
              </Text>
            </View>
            <Badge label="Draft" tone="warning" />
          </View>
        </Card>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Recent posters"
          subtitle={posters.length === 0 ? 'Posters you create will appear here' : undefined}
        />
        {posters.length === 0 ? (
          <Card>
            <Text variant="body" color={colors.inkSecondary}>
              No posters yet. Tap “Create New Poster” to start with an official template.
            </Text>
          </Card>
        ) : (
          <FlatList
            horizontal
            data={posters.slice(0, 10)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            renderItem={({ item }) => (
              <Card
                padded={false}
                onPress={() => navigation.navigate('Editor', { posterId: item.id })}
                style={styles.posterCard}
              >
                <PosterThumbnail templateId={item.templateId} width={150} label={item.title} />
                <View style={styles.posterMeta}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
                    {findEventType(item.eventType)?.name ?? item.eventType}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Local offices" actionLabel="All" onAction={() => navigation.navigate('OfficeSelect')} />
        <View style={styles.wrap}>
          {offices.map((office) => (
            <Card
              key={office.id}
              onPress={() => navigation.navigate('EventTypeSelect', { officeId: office.id })}
              style={styles.officeCard}
            >
              <View style={[styles.officeDot, { backgroundColor: office.accentColor }]} />
              <Text variant="bodyStrong">{office.shortName}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Templates"
          actionLabel="Browse"
          onAction={() => navigation.navigate('TemplateLibrary', {})}
        />
        <View style={styles.wrap}>
          {templates.map((template) => (
            <Card key={template.id} onPress={() => navigation.navigate('TemplateLibrary', {})} style={styles.templateChip}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {template.name}
              </Text>
              <Badge label={`v${template.version}`} tone="version" />
            </Card>
          ))}
        </View>
      </View>

      <Card onPress={() => navigation.navigate('AssetLibrary', {})}>
        <Text variant="heading">Official Asset Library</Text>
        <Text variant="caption" color={colors.inkSecondary}>
          Logos, approved images and decorations supplied by the association. These are used exactly as given —
          never generated or redrawn.
        </Text>
      </Card>
    </Screen>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  section: { gap: spacing.md },
  row: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  posterCard: { width: 150, overflow: 'hidden' },
  posterMeta: { padding: spacing.md, gap: 2 },
  officeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  officeDot: { width: 10, height: 10, borderRadius: radius.pill },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    maxWidth: '100%',
  },
});
