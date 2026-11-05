/* The handle a traveller is given for their trip request.
 *
 * Random, not the row id. Two reasons, and the second is the one that matters:
 *
 *   - a sequential id tells anyone who makes one request roughly how many the site receives;
 *   - erasure is keyed on this value, so a guessable handle turns the erasure form into a way
 *     to look up or delete somebody else's request. With 12 characters from a 32-symbol
 *     alphabet there are 32^12 ≈ 2^60 possibilities, which is not guessable, and the uniqueness
 *     is enforced by the column rather than hoped for.
 *
 * It is shown on the confirmation screen and nowhere else, which is why the alphabet matters:
 * somebody will read it aloud down a phone or copy it off a screenshot.
 */

/* Crockford-style: no I, L, O or U. The first three are unreadable next to 1 and 0; U is
 * dropped so the generator cannot produce an unfortunate word. Uppercase only, so there is no
 * case to get wrong when it is typed back in. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const REFERENCE_LENGTH = 12;

/**
 * A new reference, e.g. `R7K2-9QMX-4TBV` — grouped for reading, stored without the dashes.
 *
 * Uses `crypto.getRandomValues`, which is available in Workers and is the only acceptable
 * source here: `Math.random` is not unpredictable, and this value is an access credential for
 * an erasure request.
 *
 * Rejection sampling rather than `% 32`, even though 256 happens to be divisible by 32 and the
 * modulo would be unbiased today — the bias would appear silently the moment somebody changed
 * the alphabet's length, and a biased credential is a weaker credential.
 */
export function newReference(): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const out: string[] = [];
  const buffer = new Uint8Array(REFERENCE_LENGTH * 2);

  while (out.length < REFERENCE_LENGTH) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (out.length === REFERENCE_LENGTH) break;
      if (byte < limit) out.push(ALPHABET[byte % ALPHABET.length]);
    }
  }

  return out.join('');
}

/** `R7K29QMX4TBV` → `R7K2-9QMX-4TBV`, for showing a person. Never used as the stored form. */
export const formatReference = (reference: string): string =>
  (reference.match(/.{1,4}/g) ?? [reference]).join('-');

/**
 * What a reference somebody typed back in means, or null.
 *
 * Forgiving about the things a person gets wrong when copying — case, dashes, surrounding
 * space — and strict about everything else. It does not "correct" lookalike characters: turning
 * a typed `O` into `0` would mean a reference could match a request that is not theirs.
 */
export function normaliseReference(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/-/g, '');
  if (cleaned.length !== REFERENCE_LENGTH) return null;
  for (const character of cleaned) if (!ALPHABET.includes(character)) return null;
  return cleaned;
}
