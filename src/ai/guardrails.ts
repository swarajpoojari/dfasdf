import { err, ok, type Result } from '@/utils/result';

/**
 * AI GUARDRAILS
 *
 *   GENERATIVE AI CAN ASSIST THE CONTENT.
 *   OFFICIAL ASSETS MUST COME FROM THE APPROVED ASSET LIBRARY.
 *
 * This module is the seam. Everything the assistant is allowed to do is listed
 * in `AI_CAPABILITIES`; the capability type has no image-producing member, so
 * "generate a logo" is not a request this system can express, let alone answer.
 *
 * The text checks below are a second line of defence for free-text prompts a
 * user might type into the assistant.
 */
export const AI_CAPABILITIES = [
  'writeDescription',
  'correctGrammar',
  'shortenText',
  'suggestTitles',
  'formatProgramme',
  'checkSpelling',
  'suggestLayout',
  'explainOverflow',
  'suggestTemplate',
  'structureRawEvent',
] as const;

export type AiCapability = (typeof AI_CAPABILITIES)[number];

export const AI_CAPABILITY_LABELS: Readonly<Record<AiCapability, string>> = {
  writeDescription: 'Write an event description',
  correctGrammar: 'Correct the grammar',
  shortenText: 'Make this shorter',
  suggestTitles: 'Suggest a title',
  formatProgramme: 'Tidy up the programme',
  checkSpelling: 'Check the spelling',
  suggestLayout: 'Suggest layout improvements',
  explainOverflow: 'Explain what is overflowing',
  suggestTemplate: 'Suggest a template',
  structureRawEvent: 'Turn my notes into event details',
};

/** Things the assistant must never be asked to produce. */
const FORBIDDEN_SUBJECTS: readonly { pattern: RegExp; subject: string }[] = [
  { pattern: /narayana\s*guru|नारायण\s*गुरु|ನಾರಾಯಣ\s*ಗುರು/i, subject: 'Sri Narayana Guru' },
  { pattern: /koti[\s-]*chennaya|कोटि|ಕೋಟಿ/i, subject: 'Koti-Chennaya' },
  { pattern: /billawar.*(logo|emblem|symbol|seal)|(logo|emblem|symbol|seal).*billawar/i, subject: 'the association logo' },
  { pattern: /\b(logo|emblem|seal|monogram|crest)\b/i, subject: 'a logo or emblem' },
  { pattern: /\b(deity|god|goddess|temple)\b.*\b(image|picture|photo|render)\b/i, subject: 'religious imagery' },
  { pattern: /\bportrait\b|\bphotograph of\b/i, subject: 'a portrait or photograph' },
];

const IMAGE_VERBS =
  /\b(generate|create|draw|redraw|render|paint|illustrate|recreate|regenerate|imagine|upscale|enhance|restore|retouch|beautify|stylis[ez]|colouris[ez]|coloriz[ez]|remove\s+the\s+background)\b/i;

const IMAGE_NOUNS = /\b(image|picture|photo|photograph|artwork|illustration|graphic|icon|logo|emblem|seal|portrait)\b/i;

export interface GuardrailRefusal {
  readonly message: string;
  readonly reason: 'identity-subject' | 'image-generation';
}

/**
 * Checks a free-text instruction before it is sent anywhere.
 *
 * The refusal text is the one the product rule prescribes, so a user who asks
 * for a logo gets pointed at the asset library rather than an approximation.
 */
export function checkAiRequest(instruction: string): Result<true, GuardrailRefusal> {
  const text = instruction.trim();
  if (!text) return ok(true);

  for (const forbidden of FORBIDDEN_SUBJECTS) {
    if (forbidden.pattern.test(text)) {
      return err({
        reason: 'identity-subject',
        message: `Approved asset required. ${capitalise(forbidden.subject)} is never generated or redrawn — please use the approved image from the Official Asset Library.`,
      });
    }
  }

  if (IMAGE_VERBS.test(text) && IMAGE_NOUNS.test(text)) {
    return err({
      reason: 'image-generation',
      message:
        'The assistant helps with the words on the poster — titles, descriptions and the programme. Images come from the Official Asset Library, where the association has approved them.',
    });
  }

  return ok(true);
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Belt and braces for anything returned by a provider: a text assistant must
 * return text, never a URL or a data URI that some later code might try to
 * place on a poster.
 */
export function sanitiseAiText(value: string): string {
  return value
    .replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/gi, '')
    .replace(/https?:\/\/\S+\.(png|jpe?g|webp|svg|gif)\b/gi, '')
    .trim();
}
