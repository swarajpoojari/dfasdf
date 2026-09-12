const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Short, collision-resistant-enough id for locally created documents and
 * elements. Server-issued ids (templates, official assets) are authored by the
 * admin panel and are never generated here.
 */
export function createId(prefix: string): string {
  let body = '';
  for (let i = 0; i < 10; i += 1) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}_${Date.now().toString(36)}${body}`;
}
