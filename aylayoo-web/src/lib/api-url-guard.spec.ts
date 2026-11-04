// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertApiUrl, checkApiUrl, LOCAL_HOSTS } = require('../../scripts/api-url-guard.cjs');

/* The build-time guard on NEXT_PUBLIC_API_URL.
 *
 * It exists because getting this variable wrong is not recoverable at runtime — it is compiled
 * into the client bundle — and the only symptom is a live site whose every API-backed section is
 * empty, with nothing failing loudly. See docs/incidents.md, incident 1.
 *
 * The two pins (the deploy target and cf:deploy) stop the known cause. This guard is the
 * backstop for the ones we have not thought of, so what matters is that it fires on a
 * production build and stays silent everywhere it would be a nuisance.
 */

const LIVE = 'https://aylayoo-service.sbolorsaikhan4.workers.dev';

describe('checkApiUrl — when it must stay silent', () => {
  it('ignores development entirely, where the localhost default is the point', () => {
    expect(checkApiUrl({ nodeEnv: 'development', url: undefined })).toBeNull();
    expect(checkApiUrl({ nodeEnv: 'development', url: 'http://localhost:4003' })).toBeNull();
  });

  it('ignores test, so jest never trips over it', () => {
    expect(checkApiUrl({ nodeEnv: 'test', url: undefined })).toBeNull();
  });

  it('accepts a real production URL', () => {
    expect(checkApiUrl({ nodeEnv: 'production', url: LIVE })).toBeNull();
  });

  it('lets a preview opt out, which is how the preview targets point at a local API', () => {
    expect(checkApiUrl({
      nodeEnv: 'production',
      url: 'http://localhost:4003',
      allowLocal: 'true',
    })).toBeNull();
  });

  it('only accepts the exact opt-out string, not any truthy value', () => {
    // A stray ALLOW_LOCAL_API_URL=0 or =false must not disable the guard.
    for (const allowLocal of ['1', 'yes', 'false', '0', 'TRUE', '']) {
      expect(checkApiUrl({ nodeEnv: 'production', url: 'http://localhost:4003', allowLocal }))
        .not.toBeNull();
    }
  });
});

describe('checkApiUrl — when it must fire', () => {
  it('refuses a production build with the variable unset', () => {
    const problem = checkApiUrl({ nodeEnv: 'production', url: undefined });
    expect(problem).toContain('not set');
    expect(problem).toContain('cf:deploy');
  });

  it('refuses an empty or whitespace value', () => {
    expect(checkApiUrl({ nodeEnv: 'production', url: '' })).toContain('not set');
    expect(checkApiUrl({ nodeEnv: 'production', url: '   ' })).toContain('not set');
  });

  it.each(LOCAL_HOSTS as string[])('refuses the local host %s', (host: string) => {
    // Every entry must be a form `new URL().hostname` can actually produce — which is why
    // IPv6 is bracketed. A bare `::1` is unparseable and lands in the branch below instead.
    const problem = checkApiUrl({ nodeEnv: 'production', url: `http://${host}:4003` });
    expect(problem).toContain('local address');
  });

  it('refuses a bare ::1, via the unparseable branch', () => {
    expect(checkApiUrl({ nodeEnv: 'production', url: 'http://::1:4003' }))
      .toContain('not a valid URL');
  });

  it('refuses the exact value that caused the incident', () => {
    expect(checkApiUrl({ nodeEnv: 'production', url: 'http://localhost:4003' }))
      .toContain('local address');
  });

  it('refuses a value that is not a URL at all', () => {
    expect(checkApiUrl({ nodeEnv: 'production', url: 'aylayoo-service.workers.dev' }))
      .toContain('not a valid URL');
  });

  it('names the file to read, so the message is actionable', () => {
    expect(checkApiUrl({ nodeEnv: 'production', url: 'http://localhost:4003' }))
      .toContain('docs/incidents.md');
  });
});

describe('assertApiUrl', () => {
  it('throws on a bad production environment', () => {
    expect(() => assertApiUrl({ NODE_ENV: 'production', NEXT_PUBLIC_API_URL: 'http://localhost:4003' }))
      .toThrow(/local address/);
  });

  it('is a no-op on a good one', () => {
    expect(() => assertApiUrl({ NODE_ENV: 'production', NEXT_PUBLIC_API_URL: LIVE }))
      .not.toThrow();
  });

  it('is a no-op for the preview targets', () => {
    expect(() => assertApiUrl({
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: 'http://localhost:4003',
      ALLOW_LOCAL_API_URL: 'true',
    })).not.toThrow();
  });

  it('is a no-op under jest, which runs with NODE_ENV=test', () => {
    // Called with no argument it reads the real process.env; this must not break the suite.
    expect(() => assertApiUrl()).not.toThrow();
  });
});
