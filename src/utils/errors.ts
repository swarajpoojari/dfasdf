/**
 * Human-readable errors.
 *
 * Rule for this codebase: a user never sees a stack trace, an error code or a
 * native message. Every failure surfaced in the UI goes through `AppError`,
 * which always carries a plain-language `message` and, where possible, a
 * concrete `remedy` telling the user what to do next.
 */
export type AppErrorCode =
  | 'ASSET_UNAVAILABLE'
  | 'ASSET_NOT_APPROVED'
  | 'PROTECTED_OPERATION_BLOCKED'
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_VERSION_MISMATCH'
  | 'CONTENT_INCOMPLETE'
  | 'LAYOUT_OVERFLOW'
  | 'EXPORT_FAILED'
  | 'STORAGE_FAILED'
  | 'AI_UNAVAILABLE'
  | 'AI_REQUEST_NOT_PERMITTED'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly remedy?: string;

  constructor(code: AppErrorCode, message: string, options?: { remedy?: string; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.remedy = options?.remedy;
  }
}

const FALLBACK_MESSAGE =
  'Something went wrong while working on this poster. Your draft has been kept — please try again.';

/** Converts anything thrown anywhere in the app into a message we can show. */
export function toUserMessage(error: unknown): { message: string; remedy?: string } {
  if (error instanceof AppError) {
    return error.remedy ? { message: error.message, remedy: error.remedy } : { message: error.message };
  }
  if (error instanceof Error && error.message && !/^[A-Za-z]+Error: 0x/.test(error.message)) {
    // Known library errors are still not shown raw; we only use them for logs.
    return { message: FALLBACK_MESSAGE };
  }
  return { message: FALLBACK_MESSAGE };
}
