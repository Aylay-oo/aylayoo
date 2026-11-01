/* Cloudflare Web Analytics.
 *
 * No cookies, no localStorage, no fingerprinting and no cross-site identifiers, so there is
 * nothing here to ask consent for — which is the reason it was chosen over the alternatives.
 *
 * The token is public by design: it ships in the HTML of every page, and it only identifies
 * which site a page view belongs to. It is passed at build time the same way NEXT_PUBLIC_API_URL
 * is, rather than committed, so there is one place to change it.
 *
 * Renders nothing without a token, which keeps `next dev`, the test suite and any build that
 * does not set it from beaconing. A server component, because it only emits a tag.
 */

const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function Analytics(
  { token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN }: { token?: string },
) {
  if (!token) return null;

  return (
    <script
      defer
      src={BEACON_SRC}
      // The shape Cloudflare's own snippet uses; the beacon reads its config from this attribute.
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
