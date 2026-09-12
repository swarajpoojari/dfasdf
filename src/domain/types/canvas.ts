import type { Size } from './common';

/**
 * The fixed design coordinate system.
 *
 * Every element position, font size and image frame in a template is authored
 * against these units. The editor viewport scales this space down to the
 * device; export scales it up to the requested pixel size. Nothing in the app
 * ever measures a poster in screen pixels — that is what makes on-screen
 * preview and exported file identical.
 */
export const DESIGN_CANVAS: Size = { width: 1080, height: 1536 };

export const DESIGN_ASPECT_RATIO = DESIGN_CANVAS.width / DESIGN_CANVAS.height;

/** Nothing important should be placed outside this margin (print/crop safety). */
export const SAFE_MARGIN = 48;

/** Editor snap grid, in design units. */
export const GRID_STEP = 12;

export interface ExportScale {
  /** Human label shown in the export sheet. */
  readonly label: string;
  /** Multiplier applied to DESIGN_CANVAS to produce output pixels. */
  readonly scale: number;
}

export const EXPORT_SCALES: readonly ExportScale[] = [
  { label: 'WhatsApp / Status (1080 × 1536)', scale: 1 },
  { label: 'High quality (1620 × 2304)', scale: 1.5 },
  { label: 'Print draft (2160 × 3072)', scale: 2 },
];

export function scaledCanvas(scale: number): Size {
  return {
    width: Math.round(DESIGN_CANVAS.width * scale),
    height: Math.round(DESIGN_CANVAS.height * scale),
  };
}
