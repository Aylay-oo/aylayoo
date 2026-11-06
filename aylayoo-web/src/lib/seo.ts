/* Everything the detail pages and the sitemap agree on about URLs and share cards.
 *
 * The site answers on three hostnames — aylayoo.com, www.aylayoo.com and the original
 * aylayoo-web…workers.dev — which is three URLs for identical content. SITE_URL is the one
 * canonical answer, and `metadataBase` in app/layout.tsx makes every relative path here resolve
 * against it, so an og:image is absolute by the time a crawler sees it.
 */

import type { Metadata } from 'next';

export const SITE_URL = 'https://aylayoo.com';

/** The brand, as it appears after the page's own name in a <title>. */
export const SITE_NAME = 'АЯЛЪЯ ӨӨ';

/* The address a traveller reaches the team on, and the only one.
 *
 * Here rather than inline because two places now depend on it being the same address: the
 * footer's contact list, and the privacy notice's deletion line — where it is not decoration
 * but the mechanism. Erasure is not self-service (it needs an admin to match the reference
 * against the contact used), so a notice that promises deletion without saying where to ask
 * promises nothing. Two copies of an address is how one of them goes stale.
 *
 * Note the spelling: **aylayoo**123, matching the brand and the domain. The transposed form
 * "ayalyoo" appears elsewhere in this repo and is not a typo there — the old Vercel project is
 * genuinely named `ayalyoo-web` (see the service's ALLOWED_ORIGINS), and the admin login account
 * in the service README uses it too. Neither of those is this address. An unreachable address on
 * the deletion line would make that promise undeliverable, and it is the one claim on the form a
 * traveller has to be able to act on. */
export const TEAM_EMAIL = 'aylayoo123@gmail.com';

/* Share cards are built from public/images by scripts/build-og-images.mjs, cropped to Open
 * Graph's 1.905:1 — see that file for why the raw photos cannot be used directly. The key is a
 * photo key from src/lib/photos.ts, so a place's card is a crop of the very photo on its card. */
export const ogCard = (key: string) => `/og/${key}.jpg`;

/** For anything with no photo of its own, which is most of the 50 imported association guides. */
export const DEFAULT_OG_IMAGE = ogCard('hero1');

/** The two titles a page answers to, so the language switch can swap between them. */
export type PageTitles = { mn: string; en: string };

/* The home page's pair, and the default for any page that does not name its own.
 *
 * Here rather than in i18n.tsx, which is 'use client': a value imported from a client module
 * into a server component's `metadata` arrives as a client reference, not a string, and Next
 * drops the field without complaining. That left the home page with no <title> at all. */
export const HOME_TITLES: PageTitles = {
  mn: `${SITE_NAME} | Монголын аяллын платформ`,
  en: 'AYLAYOO | Travel in Mongolia',
};

/** "Хонгорын элс | АЯЛЪЯ ӨӨ" — the page's own name first, the brand after. */
export const pageTitle = (name: string) => `${name} | ${SITE_NAME}`;

/* Open Graph wants a sentence or two, and a crawler shows roughly 160 characters. Cuts on a word
 * boundary rather than mid-word, and only when there is something to cut. */
export function clamp(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/* The title/description/canonical/OG/Twitter block, in one place so the three detail pages
 * cannot drift apart in what they tell a crawler.
 *
 * Mongolian only, and og:locale says so. The language switch is client state, so one URL can
 * carry exactly one set of these tags; the body still reads in either language. */
export function detailMetadata(
  { name, description, path, image, imageAlt }: {
    name: string;
    description: string;
    path: string;
    image: string;
    imageAlt: string;
  },
): Metadata {
  const title = pageTitle(name);
  const summary = clamp(description);

  return {
    title,
    description: summary,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: summary,
      url: path,
      siteName: SITE_NAME,
      locale: 'mn_MN',
      type: 'article',
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description: summary, images: [image] },
  };
}

/* What a detail page reports when its id or slug matches nothing. noindex matters: without it a
 * crawler that followed a stale link would index the 404 under the old URL. */
export const notFoundMetadata: Metadata = {
  title: pageTitle('Хуудас олдсонгүй'),
  robots: { index: false, follow: false },
};

/** A positive integer route segment, or null — ids come off the URL as strings. */
export function routeId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
