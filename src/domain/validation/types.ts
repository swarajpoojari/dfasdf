import type { PosterDocument } from '@/domain/types/document';
import type { PosterLayout } from '@/domain/layout/types';
import type { PosterTemplate } from '@/domain/types/template';
import type { OfficialAsset } from '@/domain/types/assets';
import type { AssetSlot } from '@/domain/assets/slots';
import type { LocalOffice } from '@/domain/types/office';
import type { EventTypeDefinition } from '@/domain/types/eventType';

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationFinding {
  readonly ruleId: string;
  readonly severity: Severity;
  /** Short label shown in the checklist, e.g. "Official Association Logo". */
  readonly title: string;
  /** Full sentence shown when the check fails. */
  readonly message?: string;
  readonly elementId?: string;
  readonly autoFix?: AutoFixDescriptor;
}

export interface AutoFixDescriptor {
  readonly label: string;
  readonly description: string;
  /** Identifies which fix to run; the fix itself lives in autofix.ts. */
  readonly kind: 'relax-section' | 'nudge-into-canvas' | 'hide-empty-element';
  readonly elementId: string;
}

export interface ValidationContext {
  readonly document: PosterDocument;
  readonly template: PosterTemplate;
  readonly office: LocalOffice;
  readonly eventType?: EventTypeDefinition;
  readonly layout: PosterLayout;
  readonly lookupAsset: (id: string) => OfficialAsset | undefined;
  readonly lookupSlot: (id: string) => AssetSlot | undefined;
}

export interface ValidationRule {
  readonly id: string;
  readonly title: string;
  readonly severity: Severity;
  /** Returns findings; an empty array means the check passed. */
  run(context: ValidationContext): readonly ValidationFinding[];
}

export interface ValidationReport {
  readonly checks: readonly { ruleId: string; title: string; passed: boolean; severity: Severity }[];
  readonly findings: readonly ValidationFinding[];
  readonly errors: readonly ValidationFinding[];
  readonly warnings: readonly ValidationFinding[];
  /** Export is refused while this is false. */
  readonly canExport: boolean;
}
