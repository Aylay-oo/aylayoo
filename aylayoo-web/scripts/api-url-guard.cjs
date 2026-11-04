//@ts-check

/**
 * Refuses to let a production build inline a local API URL.
 *
 * NEXT_PUBLIC_API_URL is compiled into the client bundle by `next build`, so getting it wrong
 * is not recoverable at runtime — the only symptom is a live site whose every API-backed
 * section is empty, and nothing fails loudly. That happened: see ../../docs/incidents.md.
 *
 * Two pins already stop the known cause (the `deploy` target and `cf:deploy` set the URL
 * unconditionally, so no `.env` file can win). This is the backstop for the causes we have not
 * thought of — a new deploy path, a CI runner with its own env, a hand-run `next build`.
 *
 * CommonJS, and a pure function separate from next.config.js, for two reasons: next.config.js
 * is CJS and cannot import TypeScript, and a guard nobody can unit-test is a guard nobody
 * trusts. api-url-guard.spec.ts drives this directly.
 */

/* Hosts that mean "my machine" and must never reach a production bundle.
 *
 * These are compared against `new URL(url).hostname`, which is why IPv6 appears bracketed:
 * `new URL('http://[::1]:4003').hostname` is `'[::1]'`, and a bare `::1` is not a parseable
 * host at all — it would be caught by the "not a valid URL" branch instead. A spec case per
 * entry keeps that straight. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'host.docker.internal'];

/**
 * What is wrong with this configuration, as a message, or null if it is fine.
 *
 * @param {object} input
 * @param {string | undefined} input.nodeEnv      process.env.NODE_ENV
 * @param {string | undefined} input.url          process.env.NEXT_PUBLIC_API_URL
 * @param {string | undefined} [input.allowLocal] process.env.ALLOW_LOCAL_API_URL
 * @returns {string | null}
 */
function checkApiUrl({ nodeEnv, url, allowLocal }) {
  /* Only production builds. `next dev` runs with NODE_ENV=development, where an unset variable
   * is normal and src/lib/api.ts's localhost fallback is the point. */
  if (nodeEnv !== 'production') return null;

  /* The documented escape hatch, set by the `preview` and `cf:preview` targets. A preview runs
   * the real Worker locally against whatever API you choose and never ships, so pointing it at
   * localhost is exactly what it is for. Deploy paths do not set this. */
  if (allowLocal === 'true') return null;

  if (!url || url.trim() === '') {
    return [
      'NEXT_PUBLIC_API_URL is not set.',
      '',
      'It is inlined into the client bundle by `next build`, so an unset value ships a bundle',
      'pointing at http://localhost:4003 (the fallback in src/lib/api.ts) and every',
      'API-backed section of the live site comes up empty.',
      '',
      'Deploy with `nx run aylayoo-web:deploy` or `bun run cf:deploy`, which both pin it.',
      'For a local preview against a local API, use the preview target, which sets',
      'ALLOW_LOCAL_API_URL=true.',
    ].join('\n');
  }

  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return `NEXT_PUBLIC_API_URL is not a valid URL: ${url}`;
  }

  if (LOCAL_HOSTS.includes(host)) {
    return [
      `NEXT_PUBLIC_API_URL points at a local address (${host}).`,
      '',
      'That value would be compiled into the client bundle, so visitors\' browsers would try',
      'to reach the API on their own machines. This is the exact failure in',
      'docs/incidents.md, incident 1.',
      '',
      'If this really is a local preview, use the preview target, which sets',
      'ALLOW_LOCAL_API_URL=true. Otherwise set the live API URL.',
    ].join('\n');
  }

  return null;
}

/** Throws if the current environment would produce a bad production bundle. */
function assertApiUrl(env = process.env) {
  const problem = checkApiUrl({
    nodeEnv: env.NODE_ENV,
    url: env.NEXT_PUBLIC_API_URL,
    allowLocal: env.ALLOW_LOCAL_API_URL,
  });
  if (problem) throw new Error(`\n\n${problem}\n`);
}

module.exports = { LOCAL_HOSTS, assertApiUrl, checkApiUrl };
