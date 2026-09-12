import { useEffect, useState } from 'react';

import type { PosterLayout } from '@/domain/layout/types';
import { useLibraryStore } from '@/state/libraryStore';
import { usePosterStore } from '@/state/posterStore';
import { toUserMessage } from '@/utils/errors';
import { loadPosterResources, type PosterResources } from './resources';
import { createSkiaMeasurer } from './skiaMeasurer';

interface ResourceState {
  readonly resources?: PosterResources;
  readonly loading: boolean;
  readonly error?: string;
}

interface LoadedResources {
  /** The asset set this result belongs to; anything else means "still loading". */
  readonly key: string;
  readonly resources?: PosterResources;
  readonly error?: string;
}

/**
 * Loads the fonts and approved images a poster needs, then upgrades the layout
 * engine from the pure-TS metric measurer to real Skia font metrics — so what
 * the user sees is measured with the same faces the export will use.
 */
export function usePosterResources(layout: PosterLayout | undefined): ResourceState {
  const lookupAsset = useLibraryStore((state) => state.lookupAsset);
  const setMeasurer = usePosterStore((state) => state.setMeasurer);
  const [loaded, setLoaded] = useState<LoadedResources>();

  const assetKey = layout?.requiredAssetIds.join(',') ?? '';

  useEffect(() => {
    let cancelled = false;

    loadPosterResources({ assetIds: assetKey ? assetKey.split(',') : [], lookupAsset })
      .then((resources) => {
        if (cancelled) return;
        setLoaded({ key: assetKey, resources });
        setMeasurer(createSkiaMeasurer(resources));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoaded({ key: assetKey, error: toUserMessage(error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [assetKey, lookupAsset, setMeasurer]);

  if (!loaded || loaded.key !== assetKey) return { loading: true };
  return { loading: false, resources: loaded.resources, error: loaded.error };
}
