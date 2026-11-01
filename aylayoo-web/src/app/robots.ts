import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo';

/* /robots.txt
 *
 * /admin already carries `robots: { index: false, follow: false }` in its own layout, which tells
 * a crawler not to index the page once it has fetched it. This says not to fetch it at all, and
 * points at the sitemap so the detail pages are found without waiting to be linked.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/admin' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
