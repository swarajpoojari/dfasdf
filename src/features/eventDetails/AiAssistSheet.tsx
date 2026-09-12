import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, Card, Text } from '@/components/ui';
import { contentAssistant } from '@/ai/contentAssistant';
import { AI_CAPABILITY_LABELS, type AiCapability } from '@/ai/guardrails';
import type { AiSuggestion } from '@/ai/types';
import { toUserMessage } from '@/utils/errors';
import { colors, spacing } from '@/theme/theme';

export interface AiAssistSheetProps {
  readonly visible: boolean;
  readonly capability: AiCapability;
  readonly text: string;
  readonly context?: { eventTypeName?: string; officeName?: string };
  readonly onClose: () => void;
  readonly onApply: (text: string) => void;
}

/**
 * The assistant only ever edits words.
 *
 * There is no image action in this sheet, and the note at the bottom says so:
 * logos and community images come from the Official Asset Library, where the
 * association has approved them.
 */
export function AiAssistSheet({ visible, capability, text, context, onClose, onApply }: AiAssistSheetProps) {
  const [suggestions, setSuggestions] = useState<readonly AiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await contentAssistant.suggestText({ capability, text, context });
      setSuggestions(response.suggestions);
      if (response.suggestions.length === 0) {
        setError('Nothing to suggest for this text yet.');
      }
    } catch (caught) {
      setError(toUserMessage(caught).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={AI_CAPABILITY_LABELS[capability]}
      subtitle="The assistant helps with the words on your poster."
      onClose={onClose}
    >
      <Button label={loading ? 'Working…' : 'Get suggestions'} onPress={run} loading={loading} fullWidth />

      {error ? <Banner tone="warning" title={error} /> : null}

      {suggestions.map((suggestion, index) => (
        <Card key={index} onPress={() => onApply(suggestion.text)}>
          <Text variant="body">{suggestion.text}</Text>
          {suggestion.note ? (
            <Text variant="caption" color={colors.inkMuted}>
              {suggestion.note}
            </Text>
          ) : null}
        </Card>
      ))}

      <View style={styles.footer}>
        <Text variant="caption" color={colors.inkMuted}>
          Generative AI can assist the content. Official assets must come from the approved asset library — the
          association logo, Sri Narayana Guru and Koti-Chennaya are never generated.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: { paddingBottom: spacing.md },
});
