import type { ProgrammeItem } from '@/domain/types/content';
import { createId } from '@/utils/id';
import { sanitiseAiText } from './guardrails';
import type { AiProvider, AiStructureResponse, AiTextRequest, AiTextResponse } from './types';

/**
 * On-device assistant.
 *
 * Poster creation must work with no internet — an office secretary on a
 * community hall's patchy connection still has to get a poster out. This
 * provider does the deterministic, rule-based part of the job locally:
 * whitespace and punctuation tidy-up, sentence-boundary shortening, title
 * casing, and parsing "5.00 pm — Deepa Prajwalana" lines into programme rows.
 *
 * When the network is available a language-model provider can be registered
 * instead; both go through the same guardrails.
 */
export class OfflineTextProvider implements AiProvider {
  readonly id = 'offline-rules';
  readonly requiresNetwork = false;

  async suggestText(request: AiTextRequest): Promise<AiTextResponse> {
    const text = sanitiseAiText(request.text);

    switch (request.capability) {
      case 'correctGrammar':
      case 'checkSpelling':
        return this.response([{ text: tidy(text), note: 'Spacing and punctuation tidied up.' }]);

      case 'shortenText':
        return this.response([
          { text: shorten(text, request.targetLength ?? 140), note: 'Shortened to the most important sentences.' },
        ]);

      case 'suggestTitles':
        return this.response(
          titleSuggestions(text, request.context?.eventTypeName).map((suggestion) => ({ text: suggestion })),
        );

      case 'writeDescription':
        return this.response([
          {
            text: tidy(text) || describeFallback(request),
            note: 'Written offline from the details you entered. Connect to the internet for richer suggestions.',
          },
        ]);

      case 'formatProgramme':
        return this.response([{ text: formatProgrammeText(text), note: 'Times aligned and rows tidied.' }]);

      case 'explainOverflow':
      case 'suggestLayout':
      case 'suggestTemplate':
        return this.response([
          {
            text: 'Layout suggestions need an internet connection. In the meantime, the poster check lists exactly what does not fit.',
          },
        ]);

      case 'structureRawEvent':
      default:
        return this.response([{ text: tidy(text) }]);
    }
  }

  async structureEvent(rawNotes: string): Promise<AiStructureResponse> {
    const lines = sanitiseAiText(rawNotes)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const programme: ProgrammeItem[] = [];
    const unresolved: string[] = [];
    let title: string | undefined;
    let dateLabel: string | undefined;
    let venueName: string | undefined;

    for (const line of lines) {
      const programmeMatch = line.match(/^(\d{1,2}[.:]\d{2}\s*(?:am|pm)?)\s*[-–—|]\s*(.+)$/i);
      if (programmeMatch?.[1] && programmeMatch[2]) {
        programme.push({ id: createId('prog'), time: programmeMatch[1].trim(), title: programmeMatch[2].trim() });
        continue;
      }
      const labelled = line.match(/^(title|date|venue|place|time)\s*[:\-]\s*(.+)$/i);
      if (labelled?.[1] && labelled[2]) {
        const key = labelled[1].toLowerCase();
        const value = labelled[2].trim();
        if (key === 'title') title = value;
        else if (key === 'date' || key === 'time') dateLabel = dateLabel ? `${dateLabel} · ${value}` : value;
        else venueName = value;
        continue;
      }
      if (!title) {
        title = line;
        continue;
      }
      unresolved.push(line);
    }

    return {
      details: {
        ...(title ? { title } : {}),
        ...(dateLabel ? { dateLabel } : {}),
        ...(venueName ? { venue: { name: venueName } } : {}),
        ...(programme.length > 0 ? { programme } : {}),
      },
      unresolved,
      offline: true,
    };
  }

  private response(suggestions: readonly { text: string; note?: string }[]): AiTextResponse {
    return { suggestions: suggestions.filter((s) => s.text.length > 0), offline: true };
  }
}

/* -------------------------------------------------------------------------- */

function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(?=[^\s\d])/g, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function shorten(text: string, targetLength: number): string {
  const cleaned = tidy(text);
  if (cleaned.length <= targetLength) return cleaned;

  const sentences = cleaned.split(/(?<=[.!?।])\s+/);
  let result = '';
  for (const sentence of sentences) {
    if (result.length + sentence.length > targetLength) break;
    result += (result ? ' ' : '') + sentence;
  }
  if (result) return result;

  // No sentence boundary short enough — cut on a word boundary instead.
  const words = cleaned.split(' ');
  let clipped = '';
  for (const word of words) {
    if (clipped.length + word.length + 1 > targetLength) break;
    clipped += (clipped ? ' ' : '') + word;
  }
  return clipped || cleaned.slice(0, targetLength);
}

const TITLE_MINOR_WORDS = new Set(['of', 'the', 'and', 'for', 'in', 'on', 'at', 'to', 'by']);

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && TITLE_MINOR_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

function titleSuggestions(text: string, eventTypeName?: string): readonly string[] {
  const base = tidy(text);
  if (!base) return eventTypeName ? [eventTypeName, `Annual ${eventTypeName}`] : [];

  const suggestions = new Set<string>([titleCase(base)]);
  if (eventTypeName && !base.toLowerCase().includes(eventTypeName.toLowerCase())) {
    suggestions.add(titleCase(`${eventTypeName} — ${base}`));
  }
  suggestions.add(base.toUpperCase());
  return [...suggestions];
}

function describeFallback(request: AiTextRequest): string {
  const { eventTypeName, officeName } = request.context ?? {};
  if (eventTypeName && officeName) {
    return `${officeName} cordially invites all members to the ${eventTypeName}.`;
  }
  return '';
}

function formatProgrammeText(text: string): string {
  return tidy(text)
    .split('\n')
    .map((line) => line.replace(/^(\d{1,2})[.:](\d{2})\s*(am|pm)?\s*[-–—|]?\s*/i, (_m, h, m, suffix) =>
      `${h}.${m}${suffix ? ` ${suffix.toLowerCase()}` : ''} — `,
    ))
    .join('\n');
}
