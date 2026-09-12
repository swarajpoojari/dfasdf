import type { ExportFormat } from './types';

const EXTENSION: Readonly<Record<ExportFormat, string>> = {
  png: 'png',
  jpeg: 'jpg',
  pdf: 'pdf',
};

/** Safe across Android, iOS and WhatsApp; ASCII only, no spaces. */
export function exportFileName(title: string, officeName: string, format: ExportFormat): string {
  const slug = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 40);

  const parts = [slug(officeName), slug(title)].filter(Boolean);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = parts.length > 0 ? parts.join('_') : 'poster';
  return `${base}_${stamp}.${EXTENSION[format]}`;
}
