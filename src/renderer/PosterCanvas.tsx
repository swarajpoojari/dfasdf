import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';

import type { PosterLayout } from '@/domain/layout/types';
import { paintPoster } from './paint';
import type { PosterResources } from './resources';

interface PosterCanvasProps {
  readonly layout: PosterLayout;
  readonly resources: PosterResources;
  /** On-screen width in device points; height follows the design aspect ratio. */
  readonly width: number;
  readonly showGuides?: boolean;
}

/**
 * Renders a poster on screen.
 *
 * The whole poster is recorded into a single Skia picture and replayed, so a
 * pan or a zoom is a cheap transform rather than a re-layout, and typing into a
 * field only re-records once the debounced layout has settled.
 */
export const PosterCanvas = React.memo(function PosterCanvas({
  layout,
  resources,
  width,
  showGuides = false,
}: PosterCanvasProps) {
  const scale = width / layout.canvas.width;
  const height = layout.canvas.height * scale;

  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
    paintPoster(canvas, layout, resources, { scale, guides: showGuides });
    return recorder.finishRecordingAsPicture();
  }, [layout, resources, width, height, scale, showGuides]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
});
