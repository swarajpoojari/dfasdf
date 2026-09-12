export type ExportFormat = 'png' | 'jpeg' | 'pdf';

export interface ExportRequest {
  readonly format: ExportFormat;
  /** Multiplier on the 1080 × 1536 design canvas. */
  readonly scale: number;
  /** JPEG quality, 0–100. Ignored for PNG and PDF. */
  readonly quality?: number;
  readonly fileNameHint?: string;
}

export type ExportStage = 'preparing' | 'rendering' | 'encoding' | 'saving' | 'done';

export interface ExportProgress {
  readonly stage: ExportStage;
  /** Message shown to the user, e.g. "Preparing high-resolution poster…". */
  readonly message: string;
}

export interface ExportResult {
  readonly uri: string;
  readonly format: ExportFormat;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly fileName: string;
}

export const EXPORT_MESSAGES: Readonly<Record<ExportStage, string>> = {
  preparing: 'Preparing high-resolution poster…',
  rendering: 'Drawing the poster at full size…',
  encoding: 'Saving the image…',
  saving: 'Writing the file…',
  done: 'Poster exported successfully.',
};
