import type { Size } from './common';
import type { PosterElement } from './elements';

/** Bumped whenever the element schema changes shape; documents record it. */
export const TEMPLATE_SCHEMA_VERSION = 1;

export interface TemplateBackground {
  readonly color: string;
  /** Optional approved background asset id. */
  readonly assetId?: string;
  readonly border?: {
    readonly color: string;
    readonly width: number;
    readonly inset: number;
    readonly innerColor?: string;
    readonly innerWidth?: number;
    readonly innerInset?: number;
  };
}

export type TemplateLanguage = 'en' | 'hi' | 'mr' | 'kn';

export interface PosterTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** `null` means the template is available to every office. */
  readonly localOfficeId: string | null;
  readonly eventTypes: readonly string[];
  readonly languages: readonly TemplateLanguage[];
  readonly version: number;
  readonly schemaVersion: number;
  /** Published by the association, as opposed to a member's own saved layout. */
  readonly official: boolean;
  readonly canvas: Size;
  readonly background: TemplateBackground;
  readonly elements: readonly PosterElement[];
  /** Asset slots this template expects to be filled. */
  readonly requiredSlotIds: readonly string[];
  readonly updatedAt: string;
}

export function templateSupportsOffice(template: PosterTemplate, officeId: string): boolean {
  return template.localOfficeId === null || template.localOfficeId === officeId;
}

export function templateSupportsEventType(template: PosterTemplate, eventTypeId: string): boolean {
  return template.eventTypes.length === 0 || template.eventTypes.includes(eventTypeId);
}
