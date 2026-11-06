/* Server-side reads, for the detail pages and the sitemap.
 *
 * Separate from lib/api.ts because of how it reaches the API. In the browser an ordinary fetch to
 * the public URL is right, and that is what lib/api.ts does. On Cloudflare it is not: a Worker
 * fetching another Worker's *.workers.dev hostname on the same account is refused by the edge
 * with a 403, and the request never reaches the service — tailing aylayoo-service while loading
 * /places/1 logged nothing at all. Server reads therefore go through the `API` service binding
 * declared in wrangler.jsonc, which is a direct hop inside Cloudflare's network.
 *
 * Kept out of lib/api.ts rather than branching inside it, so that importing @opennextjs/cloudflare
 * never pulls that package into the client bundle.
 *
 * Away from Workers — `next dev`, `next start`, jest — there is no binding, so it falls back to
 * the public URL, which works fine from a plain Node process.
 */

import {
  API_URL, ApiError,
  type AimagWithPlaces, type Aimag, type CityItinerary, type CityRouteItem, type CityTour,
  type Guide, type Pagination, type Place,
} from './api';

/** The shape a service binding exposes: a fetch that takes a Request. */
type ServiceBinding = { fetch: (request: Request) => Promise<Response> };

async function serviceBinding(): Promise<ServiceBinding | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    return (env as unknown as { API?: ServiceBinding }).API ?? null;
  } catch {
    // Not running on Workers at all.
    return null;
  }
}

async function serverFetch(path: string): Promise<Response> {
  const api = await serviceBinding();
  /* The hostname is ignored by a service binding — it dispatches straight to the other Worker —
   * but Request still demands an absolute URL, and the service routes on the path alone. */
  if (api) return api.fetch(new Request(`https://aylayoo-service.internal${path}`));
  return fetch(`${API_URL}${path}`);
}

async function read<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await serverFetch(path);
  } catch {
    throw new ApiError('Сервертэй холбогдож чадсангүй');
  }

  if (!response.ok) {
    let message = '';
    try {
      message = ((await response.json()) as { error?: string }).error ?? '';
    } catch {
      // A non-JSON error body — an edge response rather than one of the service's own.
    }
    throw new ApiError(message || `Сервер ${response.status} хариу буцаалаа`, response.status);
  }
  return (await response.json()) as T;
}

/* A row that is not there comes back as null rather than throwing: the page turns that into
 * notFound(). Anything else still throws, because the API being down is a real error and must
 * not render as a tidy "not found" page. */
async function one<T>(path: string): Promise<T | null> {
  try {
    return (await read<{ data: T }>(path)).data;
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) return null;
    throw cause;
  }
}

export const getGuide = (id: number) => one<Guide>(`/api/guides/${id}`);

export const getPlace = (id: number) => one<Place>(`/api/places/${id}`);

export const getAimag = (slug: string) =>
  one<AimagWithPlaces>(`/api/aimags/${encodeURIComponent(slug)}`);

export const getAimags = async () => (await read<{ data: Aimag[] }>('/api/aimags')).data;

export const getPlaces = async () => (await read<{ data: Place[] }>('/api/places')).data;

/** The API caps `limit` at 50; see sitemap.ts for why the page count matters. */
export const getGuides = (page = 1) =>
  read<{ data: Guide[]; pagination: Pagination }>(
    `/api/guides?limit=50${page > 1 ? `&page=${page}` : ''}`,
  );

/** Guides covering one aimag. Comma lists are supported by the API, but one slug is all this
 *  needs — see the note in aylayoo-service/README.md about /api/places taking only one. */
export const getGuidesForAimag = (slug: string) =>
  read<{ data: Guide[]; pagination: Pagination }>(
    `/api/guides?limit=50&aimag=${encodeURIComponent(slug)}`,
  );

/* The city section's server-side reads, for /ulaanbaatar's two detail pages and the sitemap.
 *
 * Here rather than in api.ts for the reason at the top of this file: these run inside the web
 * Worker, which cannot fetch the service's workers.dev hostname, so they have to go through the
 * API service binding. */
export const getCityItinerary = (id: number) =>
  one<CityItinerary>(`/api/city/itineraries/${id}`);

export const getCityRoute = (id: number) => one<CityRouteItem>(`/api/city/routes/${id}`);

export const getCityItineraries = async () =>
  (await read<{ data: CityItinerary[] }>('/api/city/itineraries')).data;

export const getCityRoutes = async () =>
  (await read<{ data: CityRouteItem[] }>('/api/city/routes')).data;

/* Guide-led tours. `getCityTour` is what /ulaanbaatar/tours/[id] renders from, and
 * `getCityTours` is for the sitemap.
 *
 * Both return tours that are `published` and whose guide is `approved`. The service inner-joins
 * on the guide's status — and on NOTHING else: it does not join `guide_consent`, so this is not
 * the place consent is enforced.
 *
 * Consent is enforced on the way IN, not on the way out. A tour cannot reach `published`
 * without its guide's active `tours` consent (routes/admin-tours.ts refuses the transition on
 * both the create and the update path), and revoking that consent sets the guide's published
 * tours back to `draft` in the same D1 batch as the revocation. So a withdrawn tour is gone from
 * this response because it is no longer published — which is also why it leaves the sitemap on
 * the next crawl rather than lingering as a 404 a crawler keeps asking for.
 *
 * The distinction matters: this comment used to claim the query filtered on consent. Somebody
 * reading that would reasonably conclude the public read was the safety net, and might then
 * "simplify" the admin-side gate that actually is one. */
export const getCityTour = (id: number) => one<CityTour>(`/api/city/tours/${id}`);

export const getCityTours = async () =>
  (await read<{ data: CityTour[] }>('/api/city/tours')).data;
