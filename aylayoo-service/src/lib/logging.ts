/* What this Worker is allowed to write to its logs.
 *
 * Workers Logs is enabled in wrangler.jsonc, so anything logged here is retained and queryable
 * for days. That makes every `console.*` call a decision about what to keep about a person, and
 * three of ours were making the wrong one:
 *
 *   - `console.error(err)` in the app's error handler logged the whole error object. A D1 error
 *     can carry the failing SQL *and its bound parameters*, so a failed guide registration could
 *     have written a real phone number and email address into the log.
 *   - the rate limiter logged its error objects, and its KV key embeds the client IP
 *     (`rl:<name>:<ip>:<window>`), so an IP could travel out inside an error message. An IP is
 *     personal data whether or not it looks like one.
 *   - hono's logger builds its line from `url.slice(url.indexOf('/', 8))`, which is the path
 *     *including the query string*. Harmless for today's `?aimag=` and `?limit=`, but it is the
 *     kind of thing that quietly starts logging an address the first time an endpoint takes one.
 *
 * The rule these helpers enforce: log what happened and where, never what was in it. No request
 * bodies, no headers, no tokens, no query values, no SQL parameters, no IPs.
 */

/** An error reduced to the two things worth keeping: its type and its message. */
export function errorSummary(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name || 'Error';
    /* The message only. Not `err` itself, not `.cause`, not `.stack` — on D1 those are where the
     * statement and its parameters live. */
    return `${name}: ${redact(err.message)}`;
  }
  if (typeof err === 'string') return redact(err);
  return 'Non-error thrown';
}

/* A last line of defence over any string that reaches a log.
 *
 * The call sites above are meant to be safe already; this exists because a driver's wording is
 * not ours to control, and one library upgrade away a message could start quoting the row it
 * failed on. Shapes rather than values: anything that looks like an email address, a Mongolian
 * phone number or a long digit run is replaced before it is written.
 */
export function redact(text: string): string {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:\+?976[\s-]?)?\b\d{8,}\b/g, '[number]')
    // A bearer token, if one ever reached a message.
    .replace(/\b(Bearer|bearer)\s+[A-Za-z0-9._~+/-]+=*/g, 'Bearer [token]')
    // A JWT, with or without the Bearer prefix.
    .replace(/\beyJ[A-Za-z0-9._-]{10,}/g, '[jwt]');
}

/**
 * The path, without its query string.
 *
 * hono's logger would otherwise write the whole thing. Keeping the path means a log still says
 * which endpoint was hit — which is the question an incident actually asks — while the values
 * somebody searched with stay out of it.
 */
export function pathOnly(line: string): string {
  return line.replace(/\?[^\s]*/, '');
}

/**
 * The print function for hono's logger.
 *
 * It is handed a pre-formatted line like `--> GET /api/guides?aimag=khuvsgul 200 12ms`, so the
 * query string has to be stripped here rather than before formatting.
 */
export const logLine = (message: string, ...rest: string[]) => {
  console.log(pathOnly(redact(message)), ...rest.map(redact));
};
