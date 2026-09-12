import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Badge, Banner, Button, Screen, Text } from '@/components/ui';
import { ElementInspector } from './ElementInspector';
import { LayerList } from './LayerList';
import { EditorToolbar } from './EditorToolbar';
import { PosterCanvas } from '@/renderer/PosterCanvas';
import { usePosterResources } from '@/renderer/usePosterResources';
import { moveElement, duplicateElement, setElementLock, setElementVisibility } from '@/domain/poster/operations';
import { isAssetBacked } from '@/domain/types/elements';
import { useLibraryStore } from '@/state/libraryStore';
import { usePosterStore } from '@/state/posterStore';
import { posterRepository } from '@/storage/posterRepository';
import { colors, motion, spacing } from '@/theme/theme';
import type { ScreenProps } from '@/navigation/types';

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;

export function EditorScreen({ navigation, route }: ScreenProps<'Editor'>) {
  const { posterId } = route.params;
  const { width: screenWidth } = useWindowDimensions();

  const document = usePosterStore((state) => state.document);
  const layout = usePosterStore((state) => state.layout);
  const report = usePosterStore((state) => state.report);
  const selectedId = usePosterStore((state) => state.selectedElementId);
  const previewMode = usePosterStore((state) => state.previewMode);
  const snapToGrid = usePosterStore((state) => state.snapToGrid);
  const message = usePosterStore((state) => state.message);
  const { open, commit, select, notify, save } = usePosterStore.getState();

  const lookupAsset = useLibraryStore((state) => state.lookupAsset);
  const { resources, loading, error } = usePosterResources(layout);

  const [inspecting, setInspecting] = useState(false);

  const canvasWidth = screenWidth - spacing.lg * 2;

  useEffect(() => {
    if (document?.id === posterId) return;
    void posterRepository.load(posterId).then((loaded) => {
      if (loaded) open(loaded);
      else notify('That poster could not be opened. It may have been deleted.');
    });
  }, [posterId, document?.id, open, notify]);

  // Autosave: the editor is the only place a poster changes, so saving on each
  // committed edit means a member never loses work by backing out.
  useEffect(() => {
    if (!document) return;
    const timer = setTimeout(() => void save(), 600);
    return () => clearTimeout(timer);
  }, [document, save]);

  const scale = useSharedValue(1);
  const baseScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const designScale = layout ? canvasWidth / layout.canvas.width : 1;

  const selectAt = useCallback(
    (x: number, y: number) => {
      if (!layout || previewMode) return;
      const designX = x / designScale;
      const designY = y / designScale;

      const hit = [...layout.elements]
        .reverse()
        .find(
          (candidate) =>
            designX >= candidate.frame.x &&
            designX <= candidate.frame.x + candidate.frame.width &&
            designY >= candidate.frame.y &&
            designY <= candidate.frame.y + candidate.frame.height,
        );

      select(hit?.elementId);
      setInspecting(Boolean(hit));
    },
    [layout, designScale, previewMode, select],
  );

  const applyDrag = useCallback(
    (dx: number, dy: number) => {
      const current = usePosterStore.getState().document;
      if (!current || !selectedId) return;
      const result = moveElement(
        current,
        selectedId,
        { dx: dx / designScale / scale.value, dy: dy / designScale / scale.value },
        { lookupAsset, snapToGrid },
      );
      if (result.ok) commit(result.value);
      else notify(result.error);
    },
    // `scale` is a stable shared value; listing it would freeze the callback to
    // the zoom level at mount instead of reading the live one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, designScale, lookupAsset, snapToGrid, commit, notify],
  );

  const gesture = useMemo(() => {
    const tap = Gesture.Tap().onEnd((event) => {
      runOnJS(selectAt)(
        (event.x - offsetX.value) / scale.value,
        (event.y - offsetY.value) / scale.value,
      );
    });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        baseScale.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, baseScale.value * event.scale));
      });

    // Two fingers pan the poster; one finger drags the selected element.
    const panView = Gesture.Pan()
      .minPointers(2)
      .onBegin(() => {
        startX.value = offsetX.value;
        startY.value = offsetY.value;
      })
      .onUpdate((event) => {
        offsetX.value = startX.value + event.translationX;
        offsetY.value = startY.value + event.translationY;
      });

    const dragElement = Gesture.Pan()
      .maxPointers(1)
      .onBegin(() => {
        dragX.value = 0;
        dragY.value = 0;
      })
      .onUpdate((event) => {
        dragX.value = event.translationX;
        dragY.value = event.translationY;
      })
      .onEnd(() => {
        if (dragX.value !== 0 || dragY.value !== 0) {
          runOnJS(applyDrag)(dragX.value, dragY.value);
        }
      });

    return Gesture.Simultaneous(pinch, panView, Gesture.Exclusive(dragElement, tap));
    // Shared values are stable refs for the life of the component, so they are
    // deliberately not dependencies — re-creating the gestures on every frame
    // would cancel an in-flight drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAt, applyDrag]);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: withTiming(scale.value, { duration: motion.fast }) },
    ],
  }));

  const selectedElement = document?.elements.find((element) => element.id === selectedId);
  const selectedAsset =
    selectedElement && isAssetBacked(selectedElement) && selectedElement.assetId
      ? lookupAsset(selectedElement.assetId)
      : undefined;

  if (error) {
    return (
      <Screen>
        <Banner tone="danger" title="This poster could not be opened" message={error} />
        <Button label="Back to home" onPress={() => navigation.navigate('Home')} />
      </Screen>
    );
  }

  if (!document || !layout || loading || !resources) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="caption" color={colors.inkMuted}>
          Preparing the poster…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EditorToolbar
        onCheck={() => navigation.navigate('PosterCheck', { posterId })}
        onPreview={() => navigation.navigate('Preview', { posterId })}
        errorCount={report?.errors.length ?? 0}
      />

      {message ? (
        <View style={styles.message}>
          <Banner tone="warning" title={message} />
        </View>
      ) : null}

      <GestureDetector gesture={gesture}>
        <View style={styles.stage} collapsable={false}>
          <Animated.View style={canvasStyle}>
            <PosterCanvas
              layout={layout}
              resources={resources}
              width={canvasWidth}
              showGuides={!previewMode && Boolean(selectedId)}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      {!previewMode ? (
        <LayerList
          elements={document.elements}
          selectedId={selectedId}
          onSelect={(id) => {
            select(id);
            setInspecting(true);
          }}
        />
      ) : null}

      <View style={styles.statusBar}>
        {resources.missingFonts.length > 0 ? (
          <Badge label="Fonts not installed" tone="warning" />
        ) : (
          <Badge label={`${document.elements.length} items`} tone="neutral" />
        )}
        <Text variant="caption" color={colors.inkMuted}>
          {selectedElement ? selectedElement.name : 'Tap an item to edit it'}
        </Text>
      </View>

      <ElementInspector
        visible={inspecting && !previewMode}
        element={selectedElement}
        asset={selectedAsset}
        onClose={() => setInspecting(false)}
        onReplaceAsset={() => {
          setInspecting(false);
          if (selectedId) {
            navigation.navigate('AssetPicker', { elementId: selectedId, officeId: document.localOfficeId });
          }
        }}
        onToggleVisible={() => {
          if (selectedElement) commit(setElementVisibility(document, selectedElement.id, !selectedElement.visible));
        }}
        onToggleLock={() => {
          if (selectedElement) commit(setElementLock(document, selectedElement.id, !selectedElement.locked));
        }}
        onDuplicate={() => {
          if (!selectedElement) return;
          const result = duplicateElement(document, selectedElement.id);
          if (result.ok) commit(result.value);
          else notify(result.error);
        }}
        onEditContent={
          selectedElement?.type === 'TEXT' && selectedElement.binding
            ? () => {
                setInspecting(false);
                navigation.navigate('EventDetails', {
                  officeId: document.localOfficeId,
                  eventTypeId: document.eventType,
                  templateId: document.templateId,
                  posterId: document.id,
                });
              }
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  message: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
