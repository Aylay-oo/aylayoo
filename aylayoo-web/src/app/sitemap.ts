import type { MetadataRoute } from 'next';
import type { Guide } from '../lib/api';
import {
  getAimags, getCityItineraries, getCityRoutes, getCityTours, getGuides, getPlaces,
} from '../lib/api-server';
import { SITE_URL } from '../lib/seo';

/* /sitemap.xml
 *
 * Built per request, not at build time, for the same reason the detail pages are: a place added
 * or a guide approved through /admin should be discoverable without a redeploy.
 *
 * Every fetch degrades to an empty list on its own. A sitemap listing the home page and the 22
 * aimags is worth serving; a 500 because the guides query was slow is not — a crawler that gets
 * an error here may back off from the whole site.
 */
export const dynamic = 'force-dynamic';

const safely = async <T>(load: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await load();
  } catch {
    return [];
  }
};

/* The API caps `limit` at 50, so there is no single request that returns the whole roster once it
 * passes fifty guides — the sitemap has to walk `pagination.totalPages` or quietly list only the
 * first page. MAX_GUIDE_PAGES is a stop, not a target: it keeps a surprising `total` from turning
 * one sitemap request into hundreds of API calls. */
const MAX_GUIDE_PAGES = 20;

async function allGuides(): Promise<Guide[]> {
  const first = await getGuides();
  const guides = [...first.data];
  const pages = Math.min(first.pagination.totalPages, MAX_GUIDE_PAGES);

  for (let page = 2; page <= pages; page += 1) {
    guides.push(...(await getGuides(page)).data);
  }
  return guides;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [aimags, places, guides, itineraries, routes, tours] = await Promise.all([
    safely(getAimags),
    safely(() => getPlaces()),
    safely(allGuides),
    // All three return published rows only, so a draft is never listed for a crawler to find.
    safely(getCityItineraries),
    safely(getCityRoutes),
    safely(getCityTours),
  ]);

  const lastModified = new Date();
  const at = (path: string) => `${SITE_URL}${path}`;

  return [
    { url: at('/'), lastModified, changeFrequency: 'weekly', priority: 1 },

    /* Above places and guides on purpose: an aimag is the page that leads to both, and the one
     * most likely to match what somebody searches for. */
    ...aimags.map((aimag) => ({
      url: at(`/aimags/${aimag.slug}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),

    ...places.map((place) => ({
      url: at(`/places/${place.id}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      // A must-see place is the reason somebody comes to the country, let alone the site.
      priority: place.isMustSee ? 0.8 : 0.6,
    })),

    /* The city section, as high as an aimag: /ulaanbaatar is the page that leads to the
     * itineraries and routes under it, the way an aimag leads to its places. */
    { url: at('/ulaanbaatar'), lastModified, changeFrequency: 'weekly' as const, priority: 0.8 },

    ...itineraries.map((itinerary) => ({
      url: at(`/ulaanbaatar/itineraries/${itinerary.id}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),

    ...routes.map((route) => ({
      url: at(`/ulaanbaatar/routes/${route.id}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),

    /* A tour sits with the other city pages rather than with the guides, because it is a
     * thing to do in Ulaanbaatar — but it is the one city page that can vanish for a reason
     * nobody edited: revoking a guide's consent unpublishes their tours. */
    ...tours.map((tour) => ({
      url: at(`/ulaanbaatar/tours/${tour.id}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),

    /* Last, and lower: a guide's page changes when they edit their details, and the roster turns
     * over in a way the places never do. */
    ...guides.map((guide) => ({
      url: at(`/guides/${guide.id}`),
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ];
}
