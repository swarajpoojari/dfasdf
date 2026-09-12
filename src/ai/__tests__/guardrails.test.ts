import { ContentAssistant } from '@/ai/contentAssistant';
import { AI_CAPABILITIES, checkAiRequest, sanitiseAiText } from '@/ai/guardrails';
import { OfflineTextProvider } from '@/ai/offlineProvider';

describe('AI guardrails', () => {
  it.each([
    'generate the Billawar Association logo',
    'draw Sri Narayana Guru for the poster',
    'recreate the Koti-Chennaya image',
    'redraw our association emblem in a modern style',
    'please regenerate this photograph of the temple deity image',
    'create an illustration of Narayana Guru',
  ])('refuses: %s', (instruction) => {
    const result = checkAiRequest(instruction);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Approved asset required|Official Asset Library/i);
    }
  });

  it.each([
    'shorten this felicitation description',
    'suggest a title for the Guru Jayanti programme',
    'fix the grammar in the invitation note',
    'turn these notes into a programme schedule',
  ])('allows: %s', (instruction) => {
    expect(checkAiRequest(instruction).ok).toBe(true);
  });

  it('exposes no image-producing capability at all', () => {
    const suspicious = AI_CAPABILITIES.filter((capability) => /image|logo|photo|picture|draw|render/i.test(capability));
    expect(suspicious).toEqual([]);
  });

  it('strips image URLs and data URIs out of anything a provider returns', () => {
    const dirty = 'Use this logo https://example.com/logo.png and data:image/png;base64,AAAABBBB now';
    const clean = sanitiseAiText(dirty);
    expect(clean).not.toMatch(/https?:\/\//);
    expect(clean).not.toMatch(/data:image/);
  });
});

describe('content assistant', () => {
  const assistant = new ContentAssistant();

  it('throws a readable, on-message error for a forbidden request', async () => {
    await expect(
      assistant.suggestText({
        capability: 'writeDescription',
        text: 'draw the association logo at the top',
      }),
    ).rejects.toThrow(/Approved asset required|Official Asset Library/i);
  });

  it('works offline for the text tasks that matter', async () => {
    const response = await assistant.suggestText({
      capability: 'shortenText',
      text: 'For distinguished service in public administration. He has also led the outreach programme. And he mentors students.',
      targetLength: 60,
    });
    expect(response.offline).toBe(true);
    expect(response.suggestions[0]?.text.length).toBeLessThanOrEqual(120);
  });

  it('suggests titles without inventing facts', async () => {
    const response = await assistant.suggestText({
      capability: 'suggestTitles',
      text: 'guru jayanti celebration',
      context: { eventTypeName: 'Guru Jayanti' },
    });
    expect(response.suggestions.length).toBeGreaterThan(0);
  });
});

describe('offline structuring', () => {
  const provider = new OfflineTextProvider();

  it('turns typed notes into structured event fields', async () => {
    const result = await provider.structureEvent(
      [
        'Title: 172nd Guru Jayanthi',
        'Date: Sunday 13 September 2026',
        'Venue: Billawar Bhavan, Vashi',
        '5.00 pm - Deepa Prajwalana',
        '5.30 pm - Dharmika Sabha',
      ].join('\n'),
    );

    expect(result.details.title).toBe('172nd Guru Jayanthi');
    expect(result.details.venue?.name).toContain('Billawar Bhavan');
    expect(result.details.programme).toHaveLength(2);
    expect(result.details.programme?.[0]?.time).toBe('5.00 pm');
    expect(result.offline).toBe(true);
  });

  it('reports lines it could not place instead of guessing', async () => {
    const result = await provider.structureEvent('Annual function\nsomething ambiguous here');
    expect(result.unresolved).toContain('something ambiguous here');
  });
});
