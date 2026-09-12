import { ImageFormat, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import type { PosterLayout } from '@/domain/layout/types';
import { paintPoster } from '@/renderer/paint';
import type { PosterResources } from '@/renderer/resources';
import { AppError } from '@/utils/errors';
import { exportFileName } from './filename';
import { EXPORT_MESSAGES, type ExportProgress, type ExportRequest, type ExportResult } from './types';

export interface ExportInput {
  readonly layout: PosterLayout;
  readonly resources: PosterResources;
  readonly request: ExportRequest;
  readonly title: string;
  readonly officeName: string;
  readonly onProgress?: (progress: ExportProgress) => void;
}

/**
 * EXPORT
 *
 * The exported file is rendered from the design coordinate system into an
 * offscreen Skia surface at the requested resolution. It is never a screenshot
 * of the editor: the preview may be 340 points wide on a phone, the export is
 * 1080, 1620 or 2160 pixels, and both come from the same node list and the same
 * painter.
 */
export async function exportPoster({
  layout,
  resources,
  request,
  title,
  officeName,
  onProgress,
}: ExportInput): Promise<ExportResult> {
  const report = (stage: ExportProgress['stage']): void =>
    onProgress?.({ stage, message: EXPORT_MESSAGES[stage] });

  report('preparing');

  const width = Math.round(layout.canvas.width * request.scale);
  const height = Math.round(layout.canvas.height * request.scale);

  if (request.format === 'pdf') {
    return exportAsPdf({ layout, resources, request, title, officeName, onProgress });
  }

  report('rendering');
  const base64 = renderToBase64(layout, resources, request, width, height);

  report('encoding');
  const fileName = exportFileName(request.fileNameHint ?? title, officeName, request.format);
  const uri = `${cacheDirectory()}${fileName}`;

  report('saving');
  try {
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: 'base64' });
  } catch (cause) {
    throw new AppError('EXPORT_FAILED', 'The poster could not be saved to this device.', {
      remedy: 'Free up some storage space and try exporting again.',
      cause,
    });
  }

  const info = await FileSystem.getInfoAsync(uri);
  report('done');

  return {
    uri,
    format: request.format,
    width,
    height,
    bytes: info.exists && 'size' in info ? (info.size ?? 0) : 0,
    fileName,
  };
}

function renderToBase64(
  layout: PosterLayout,
  resources: PosterResources,
  request: ExportRequest,
  width: number,
  height: number,
): string {
  const surface = Skia.Surface.MakeOffscreen(width, height) ?? Skia.Surface.Make(width, height);
  if (!surface) {
    throw new AppError('EXPORT_FAILED', 'This device could not prepare a high-resolution poster.', {
      remedy: 'Try exporting at a smaller size, or close other apps and try again.',
    });
  }

  paintPoster(surface.getCanvas(), layout, resources, { scale: request.scale });
  surface.flush();

  const image = surface.makeImageSnapshot();
  const format = request.format === 'jpeg' ? ImageFormat.JPEG : ImageFormat.PNG;
  const base64 = image.encodeToBase64(format, request.quality ?? 95);

  if (!base64) {
    throw new AppError('EXPORT_FAILED', 'The poster image could not be produced.', {
      remedy: 'Please try again. If it keeps happening, export at a smaller size.',
    });
  }
  return base64;
}

/**
 * PDF export re-uses the PNG render and places it on a correctly-proportioned
 * page, so the printed sheet matches the shared image exactly.
 */
async function exportAsPdf({
  layout,
  resources,
  request,
  title,
  officeName,
  onProgress,
}: ExportInput): Promise<ExportResult> {
  const report = (stage: ExportProgress['stage']): void =>
    onProgress?.({ stage, message: EXPORT_MESSAGES[stage] });

  const width = Math.round(layout.canvas.width * request.scale);
  const height = Math.round(layout.canvas.height * request.scale);

  report('rendering');
  const base64 = renderToBase64(layout, resources, { ...request, format: 'png' }, width, height);

  report('encoding');
  const html = `<html><head><meta name="viewport" content="width=${width}"><style>
    @page { margin: 0; size: ${width}px ${height}px; }
    html, body { margin: 0; padding: 0; }
    img { width: ${width}px; height: ${height}px; display: block; }
  </style></head><body><img src="data:image/png;base64,${base64}" /></body></html>`;

  try {
    report('saving');
    const { uri } = await Print.printToFileAsync({ html, width, height, base64: false });
    const fileName = exportFileName(request.fileNameHint ?? title, officeName, 'pdf');
    const info = await FileSystem.getInfoAsync(uri);
    report('done');
    return {
      uri,
      format: 'pdf',
      width,
      height,
      bytes: info.exists && 'size' in info ? (info.size ?? 0) : 0,
      fileName,
    };
  } catch (cause) {
    throw new AppError('EXPORT_FAILED', 'The poster could not be turned into a PDF on this device.', {
      remedy: 'Export it as a PNG image instead — it can still be printed.',
      cause,
    });
  }
}

/** Opens the system share sheet (WhatsApp, mail, Files…). */
export async function sharePoster(result: ExportResult): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new AppError('EXPORT_FAILED', 'Sharing is not available on this device.', {
      remedy: 'The poster has been saved — you can send it from your Files app.',
    });
  }
  await Sharing.shareAsync(result.uri, {
    mimeType: result.format === 'pdf' ? 'application/pdf' : `image/${result.format}`,
    dialogTitle: 'Share poster',
    UTI: result.format === 'pdf' ? 'com.adobe.pdf' : 'public.image',
  });
}

function cacheDirectory(): string {
  const directory = FileSystem.Paths.cache.uri;
  return directory.endsWith('/') ? directory : `${directory}/`;
}
