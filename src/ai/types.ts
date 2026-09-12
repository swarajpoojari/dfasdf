import type { EventDetails } from '@/domain/types/content';
import type { AiCapability } from './guardrails';

export interface AiTextRequest {
  readonly capability: AiCapability;
  readonly text: string;
  /** Free-text instruction typed by the user, if any. */
  readonly instruction?: string;
  readonly language?: 'en' | 'hi' | 'mr' | 'kn';
  /** Target length for shortening, in characters. */
  readonly targetLength?: number;
  readonly context?: {
    readonly eventTypeName?: string;
    readonly officeName?: string;
  };
}

export interface AiSuggestion {
  readonly text: string;
  readonly note?: string;
}

export interface AiTextResponse {
  readonly suggestions: readonly AiSuggestion[];
  /** True when produced on-device without a network call. */
  readonly offline: boolean;
}

export interface AiStructureResponse {
  readonly details: Partial<EventDetails>;
  readonly unresolved: readonly string[];
  readonly offline: boolean;
}

/**
 * Providers may only ever return text or structured content.
 *
 * There is no `generateImage` here, and there never should be. If decorative
 * image generation is added in future it belongs behind a separate interface,
 * writing into a separate library that the Official Asset registry does not
 * accept mutations from (see AssetRegistry's RegistryMutationSource).
 */
export interface AiProvider {
  readonly id: string;
  readonly requiresNetwork: boolean;
  suggestText(request: AiTextRequest): Promise<AiTextResponse>;
  structureEvent(rawNotes: string): Promise<AiStructureResponse>;
}
