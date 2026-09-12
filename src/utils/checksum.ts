/**
 * FNV-1a 32-bit, rendered as 8 hex characters.
 *
 * This is an *integrity* check, not a security primitive: it detects a bundled
 * official asset manifest drifting from the file it claims to describe. Real
 * tamper-resistance is a backend concern (see docs/BACKEND.md) where assets are
 * signed at publish time.
 */
export function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
