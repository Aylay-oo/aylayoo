// Password hashing with Web Crypto (PBKDF2). Works in Cloudflare Workers and Bun.
// Stored format: "iterations:saltBase64:hashBase64"
const ITERATIONS = 100_000; // Workers' maximum for PBKDF2

const toB64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `${ITERATIONS}:${toB64(salt)}:${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [iter, saltB64, hashB64] = stored.split(':');
  if (!iter || !saltB64 || !hashB64) return false;
  const actual = new Uint8Array(await derive(password, fromB64(saltB64), Number(iter)));
  const expected = fromB64(hashB64);
  if (actual.length !== expected.length) return false;
  // constant-time comparison
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  return diff === 0;
}
