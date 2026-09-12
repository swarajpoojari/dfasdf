import { AppError } from '@/utils/errors';
import { checkAiRequest, sanitiseAiText, type AiCapability } from './guardrails';
import { OfflineTextProvider } from './offlineProvider';
import type { AiProvider, AiStructureResponse, AiTextRequest, AiTextResponse } from './types';

/**
 * The only entry point the app uses to reach an AI provider.
 *
 * Every request passes through the guardrails on the way in and the text
 * sanitiser on the way out, so there is one place to audit rather than a dozen
 * call sites.
 */
export class ContentAssistant {
  private online: AiProvider | undefined;
  private readonly offline: AiProvider = new OfflineTextProvider();

  /** Registers a network-backed provider. Text-only by construction. */
  useOnlineProvider(provider: AiProvider): void {
    this.online = provider;
  }

  clearOnlineProvider(): void {
    this.online = undefined;
  }

  isOnlineAvailable(): boolean {
    return this.online !== undefined;
  }

  supports(capability: AiCapability): boolean {
    const offlineOnly: readonly AiCapability[] = ['suggestLayout', 'suggestTemplate', 'explainOverflow'];
    return this.online !== undefined || !offlineOnly.includes(capability);
  }

  async suggestText(request: AiTextRequest): Promise<AiTextResponse> {
    const guard = checkAiRequest(`${request.instruction ?? ''} ${request.text}`);
    if (!guard.ok) {
      throw new AppError('AI_REQUEST_NOT_PERMITTED', guard.error.message, {
        remedy: 'Open the Official Asset Library to choose an approved image.',
      });
    }

    const provider = this.online ?? this.offline;
    const response = await provider.suggestText(request);
    return {
      ...response,
      suggestions: response.suggestions
        .map((suggestion) => ({ ...suggestion, text: sanitiseAiText(suggestion.text) }))
        .filter((suggestion) => suggestion.text.length > 0),
    };
  }

  async structureEvent(rawNotes: string): Promise<AiStructureResponse> {
    const guard = checkAiRequest(rawNotes);
    if (!guard.ok) {
      throw new AppError('AI_REQUEST_NOT_PERMITTED', guard.error.message);
    }
    const provider = this.online ?? this.offline;
    return provider.structureEvent(rawNotes);
  }
}

export const contentAssistant = new ContentAssistant();
