import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DESIGN_CANVAS } from '@/domain/types/canvas';
import { isAssetBacked } from '@/domain/types/elements';
import { templateRegistry } from '@/domain/templates/registry';
import { POSTER_COLORS } from '@/domain/templates/tokens';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/theme';

export interface PosterThumbnailProps {
  readonly templateId: string;
  readonly width: number;
  readonly label?: string;
}

/**
 * A schematic preview built from the template's own element frames.
 *
 * List rows do not paint real posters: decoding every official image to fill a
 * scrolling gallery would cost far more memory than a mid-range phone should
 * spend. The outline is derived from the same template data the renderer uses,
 * so it stays truthful as templates change.
 */
export const PosterThumbnail = React.memo(function PosterThumbnail({
  templateId,
  width,
  label,
}: PosterThumbnailProps) {
  const height = (width / DESIGN_CANVAS.width) * DESIGN_CANVAS.height;
  const template = templateId ? templateRegistry.get(templateId) : undefined;

  const blocks = useMemo(() => {
    if (!template) return [];
    const scale = width / template.canvas.width;
    return template.elements
      .filter((element) => element.visible && element.type !== 'LINE')
      .slice(0, 14)
      .map((element) => ({
        id: element.id,
        style: {
          left: element.frame.x * scale,
          top: element.frame.y * scale,
          width: element.frame.width * scale,
          height: Math.max(2, element.frame.height * scale),
          backgroundColor: isAssetBacked(element) ? POSTER_COLORS.goldLight : POSTER_COLORS.line,
          opacity: isAssetBacked(element) ? 0.55 : 0.3,
          borderRadius: 2,
        },
      }));
  }, [template, width]);

  return (
    <View style={[styles.frame, { width, height }]}>
      {blocks.map((block) => (
        <View key={block.id} style={[styles.block, block.style]} />
      ))}
      {blocks.length === 0 && label ? (
        <View style={styles.fallback}>
          <Text variant="caption" center numberOfLines={3} color={POSTER_COLORS.maroon}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    backgroundColor: POSTER_COLORS.paper,
    borderWidth: 2,
    borderColor: POSTER_COLORS.maroon,
    overflow: 'hidden',
  },
  block: { position: 'absolute' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
});
