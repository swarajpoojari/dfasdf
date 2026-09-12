import { Skia, type SkImage, type SkTypeface } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

import { FONT_MODULES } from '@/../assets/fonts';
import { allFontFiles } from '@/theme/fonts';
import type { OfficialAsset } from '@/domain/types/assets';
import { AppError } from '@/utils/errors';

/**
 * Decoded Skia objects the painter needs. Both maps are caches keyed by a
 * stable id, so switching templates or re-exporting never decodes the same
 * logo twice — which matters on a mid-range Android phone.
 */
export interface PosterResources {
  typeface(fontFile: string): SkTypeface | null;
  image(assetId: string): SkImage | null;
  readonly missingFonts: readonly string[];
}

const typefaceCache = new Map<string, SkTypeface | null>();
const imageCache = new Map<string, SkImage>();

async function uriForAsset(asset: OfficialAsset): Promise<string> {
  if (asset.source.kind === 'bundled') {
    if (asset.source.module === undefined) {
      throw new AppError('ASSET_UNAVAILABLE', `"${asset.name}" is not included in this build of the app.`, {
        remedy: 'Please update the app, or choose another approved image.',
      });
    }
    const bundled = Asset.fromModule(asset.source.module);
    await bundled.downloadAsync();
    return bundled.localUri ?? bundled.uri;
  }

  const uri = asset.source.uri ?? asset.uri;
  if (!uri) {
    throw new AppError('ASSET_UNAVAILABLE', `"${asset.name}" could not be found on this device.`, {
      remedy: 'Sync the official assets while connected to the internet, then try again.',
    });
  }
  return uri;
}

/** Decodes an official asset once and keeps it, keyed by id *and* version. */
export async function loadAssetImage(asset: OfficialAsset): Promise<SkImage> {
  const key = `${asset.id}@${asset.version}`;
  const cached = imageCache.get(key);
  if (cached) return cached;

  const data = await Skia.Data.fromURI(await uriForAsset(asset));
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new AppError('ASSET_UNAVAILABLE', `"${asset.name}" could not be opened.`, {
      remedy: 'Please choose another approved image from the asset library.',
    });
  }
  imageCache.set(key, image);
  return image;
}

async function loadTypeface(fontFile: string): Promise<SkTypeface | null> {
  if (typefaceCache.has(fontFile)) return typefaceCache.get(fontFile) ?? null;

  const moduleId = FONT_MODULES[fontFile];
  if (moduleId === undefined) {
    typefaceCache.set(fontFile, null);
    return null;
  }

  const bundled = Asset.fromModule(moduleId);
  await bundled.downloadAsync();
  const data = await Skia.Data.fromURI(bundled.localUri ?? bundled.uri);
  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  typefaceCache.set(fontFile, typeface);
  return typeface;
}

export interface LoadResourcesInput {
  readonly assetIds: readonly string[];
  readonly lookupAsset: (id: string) => OfficialAsset | undefined;
}

/**
 * Loads everything a poster needs before a single pixel is drawn.
 *
 * Resolving up front is what lets export be a synchronous, deterministic paint:
 * no half-drawn poster because an image was still decoding.
 */
export async function loadPosterResources({ assetIds, lookupAsset }: LoadResourcesInput): Promise<PosterResources> {
  const fontFiles = allFontFiles();
  await Promise.all(fontFiles.map(loadTypeface));

  const images = new Map<string, SkImage>();
  for (const id of assetIds) {
    const asset = lookupAsset(id);
    if (!asset) {
      throw new AppError('ASSET_UNAVAILABLE', 'One of the images used by this poster is no longer available.', {
        remedy: 'Open the editor and choose another approved image from the asset library.',
      });
    }
    images.set(id, await loadAssetImage(asset));
  }

  const missingFonts = fontFiles.filter((file) => typefaceCache.get(file) == null);

  return {
    typeface: (fontFile) => typefaceCache.get(fontFile) ?? null,
    image: (assetId) => images.get(assetId) ?? null,
    missingFonts,
  };
}

export function clearResourceCaches(): void {
  typefaceCache.clear();
  imageCache.clear();
}
