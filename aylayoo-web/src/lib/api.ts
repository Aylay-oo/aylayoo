/* The aylayoo-service REST client.
 *
 * Every section fetches its own data and renders a skeleton, then either the data or an
 * inline notice — so if the API is down or slow the page still draws completely, with the
 * static parts (map shapes, city tiles, nearby trips, copy) fully usable.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003';

export type Region = 'western' | 'khangai' | 'central' | 'eastern' | 'capital';
export type GuideType = 'individual' | 'company' | 'driver';
export type PlaceCategory = 'nature' | 'historical' | 'city' | 'cultural';
export type ContactKind = 'contact' | 'booking';

export type Aimag = {
  id: number;
  slug: string;
  nameMn: string;
  nameEn: string;
  region: Region | null;
  descriptionMn: string | null;
  descriptionEn: string | null;
  imageUrl: string | null;
  /** ISO 3166-2:MN code, e.g. "MN-041" — how the map's SVG shapes are keyed. */
  isoCode: string | null;
  centerMn: string | null;
  centerEn: string | null;
  /** Thousands of km², as the info card prints it. */
  areaKm2: number | null;
};

/** What `/api/aimags/:slug` returns: the aimag with its places embedded.
 *
 * Those places come from a plain select, so unlike `/api/places` they carry no `aimagSlug` /
 * `aimagNameMn` / `aimagNameEn` — the aimag they belong to is the one you just asked for. */
export type AimagWithPlaces = Aimag & { places: Place[] };

export type Place = {
  id: number;
  aimagId: number;
  nameMn: string;
  nameEn: string;
  descriptionMn: string | null;
  descriptionEn: string | null;
  category: PlaceCategory;
  lat: number | null;
  lng: number | null;
  images: string[];
  isMustSee: boolean;
  /** Which stock photo to use: lake, mountain, desert, temple, … */
  imageKey: string | null;
  bestMonthsMn: string | null;
  bestMonthsEn: string | null;
  /** The must-see carousel's own headline and blurb, wider than the place itself. */
  mustTitleMn: string | null;
  mustTitleEn: string | null;
  mustSummaryMn: string | null;
  mustSummaryEn: string | null;
  /** Present on /api/places, absent on /api/aimags/:slug. */
  aimagSlug?: string;
  aimagNameMn?: string;
  aimagNameEn?: string;
};

export type Guide = {
  id: number;
  type: GuideType;
  name: string;
  bioMn: string | null;
  bioEn: string | null;
  languages: string[];
  tripTypes: ('city' | 'countryside')[];
  /* No `phone` or `email`. They are columns on the guides table, but the public API does not
   * send them — see publicColumns in aylayoo-service/src/routes/guides.ts. They used to be
   * here, and the type claiming them is how a public page could have started rendering a
   * guide's contact details without anyone noticing. AdminGuide adds them back for the admin
   * screens, which read /api/admin/guides and are the only place they belong. */
  photoUrl: string | null;
  website: string | null;
  /* No `createdAt` or `fullName` either, for the same reason as phone and email: the public
   * API does not send them. `fullName` is the association's full legal form of the name, which
   * guide-view.ts already refused to pass across the client boundary while the API went on
   * publishing it; `createdAt` is roster bookkeeping nothing renders. Both are on AdminGuide. */
  /** Either this or experienceYears, never both: someone who registers themselves gives a
   *  number, the association's roster gives a band like "4-6 жил". */
  experienceYears: number | null;
  experienceRange: string | null;
  routeMn: string | null;
  routeEn: string | null;
  car: string | null;
  /** Null until real travellers rate them — the stars stay hidden while it is. */
  rating: number | null;
  reviewCount: number | null;
  aimags: { id: number; slug: string; nameMn: string; nameEn: string }[];
};

export type TeamMember = {
  id: number;
  name: string;
  role: string;
  photoUrl: string | null;
  sortOrder: number;
  nameEn: string | null;
  roleEn: string | null;
  schoolMn: string | null;
  schoolEn: string | null;
  descriptionMn: string | null;
  descriptionEn: string | null;
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

/** Anything that went wrong, already phrased for a person to read. */
export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    // A network failure, a CORS rejection or the Worker not running all land here, with no
    // detail available to us by design.
    throw new ApiError('Сервертэй холбогдож чадсангүй');
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      message = ((await response.json()) as { error?: string }).error;
    } catch {
      // A non-JSON error body (a proxy's HTML page, say) leaves the status to speak.
    }
    throw new ApiError(message || `Сервер ${response.status} хариу буцаалаа`, response.status);
  }

  return (await response.json()) as T;
}

const list = async <T>(path: string) => (await request<{ data: T[] }>(path)).data;

export const getAimags = () => list<Aimag>('/api/aimags');

export const getTeam = () => list<TeamMember>('/api/team');

export function getPlaces(options: { mustSee?: boolean; aimag?: string; category?: string } = {}) {
  const query = new URLSearchParams();
  if (options.mustSee) query.set('mustSee', 'true');
  if (options.aimag) query.set('aimag', options.aimag);
  if (options.category) query.set('category', options.category);
  const suffix = query.size ? `?${query}` : '';
  return list<Place>(`/api/places${suffix}`);
}

/** The API caps `limit` at 50; the carousels want everyone, so ask for the maximum. */
export const GUIDES_PAGE_LIMIT = 50;

export async function getGuides(
  options: { type?: GuideType; aimag?: string[]; page?: number } = {},
) {
  const query = new URLSearchParams({ limit: String(GUIDES_PAGE_LIMIT) });
  if (options.type) query.set('type', options.type);
  if (options.aimag?.length) query.set('aimag', options.aimag.join(','));
  if (options.page && options.page > 1) query.set('page', String(options.page));
  return request<{ data: Guide[]; pagination: Pagination }>(`/api/guides?${query}`);
}

/* Single-resource reads, for the detail pages.
 *
 * These run on the server, so a row that is not there has to come back as a value rather than an
 * exception: the page turns null into notFound(). Anything else still throws, because the API
 * being down is a real error and must not render as a tidy "not found" page.
 *
 * A guide whose status is not `approved` 404s at the API, so it 404s here too — pending and
 * rejected guides have no public page, which is the point.
 */
async function one<T>(path: string): Promise<T | null> {
  try {
    return (await request<{ data: T }>(path)).data;
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) return null;
    throw cause;
  }
}

export const getGuide = (id: number) => one<Guide>(`/api/guides/${id}`);

export const getPlace = (id: number) => one<Place>(`/api/places/${id}`);

export const getAimag = (slug: string) =>
  one<AimagWithPlaces>(`/api/aimags/${encodeURIComponent(slug)}`);

export type ContactInput = {
  name: string;
  /** One of these two is required; the API rejects a message with neither. */
  email?: string;
  phone?: string;
  message: string;
  guideId?: number;
  subject?: string;
  kind?: ContactKind;
};

export function sendContact(input: ContactInput) {
  return request<{ message: string }>('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export type GuideRegisterInput = {
  type: GuideType;
  name: string;
  bioMn?: string;
  bioEn?: string;
  languages: string[];
  tripTypes: ('city' | 'countryside')[];
  aimagIds: number[];
  phone: string;
  email: string;
  website?: string;
  experienceYears?: number;
  routeMn?: string;
  routeEn?: string;
  /** Required for `driver`, rejected for anyone else. */
  car?: string;
};

/** Multipart, because a registration can carry a photo. Saved as pending for review. */
export function registerGuide(input: GuideRegisterInput, photo?: File | null) {
  const form = new FormData();
  form.append('data', JSON.stringify(input));
  if (photo) form.append('photo', photo);
  return request<{ data: { id: number; status: string }; message: string }>(
    '/api/guides/register',
    { method: 'POST', body: form },
  );
}

/** Guide photos live in R2 behind the API, so their stored paths need the API origin. */
export function imageUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  return photoUrl.startsWith('/') ? `${API_URL}${photoUrl}` : photoUrl;
}

/* ---------------------------------------------------------------------------
 * Phase 2 — the Ulaanbaatar city section.
 *
 * Six resources the team edits in /admin. The API serves only published rows, so nothing here
 * has to filter on status: a draft never arrives. The `status` field is still on the type
 * because the admin client (lib/admin-api.ts) reads the same shapes and does see drafts.
 * ------------------------------------------------------------------------- */

export type CityStatus = 'draft' | 'published';
export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening';
export type TipTopic = 'transport' | 'money' | 'weather' | 'etiquette';
export type PhraseCategory =
  'greetings' | 'basics' | 'food' | 'directions' | 'numbers' | 'emergency';
/** 1, 2 or 3 — the only itinerary lengths the section offers. */
export type ItineraryDays = 1 | 2 | 3;
/** 1 = cheap, 3 = expensive. Null when nobody has filled it in; never guessed. */
export type PriceLevel = 1 | 2 | 3;

/* One stop on an itinerary or a walking route. The array's order is the route.
 *
 * `lat`/`lng` are both-or-neither and may be null — StopMap falls back to the ordered list for
 * a stop without them rather than putting a marker where the stop is not. */
export type CityStop = {
  placeMn: string;
  placeEn: string;
  /** Set on an itinerary's stops; null on a walking route's, which is walked in one go. */
  timeOfDay: TimeOfDay | null;
  noteMn: string | null;
  noteEn: string | null;
  lat: number | null;
  lng: number | null;
};

/** What every city row has in common, so the admin editors can treat them alike. */
type CityRow = {
  id: number;
  status: CityStatus;
  sortOrder: number;
};

export type CityItinerary = CityRow & {
  titleMn: string;
  titleEn: string;
  days: ItineraryDays;
  summaryMn: string | null;
  summaryEn: string | null;
  stops: CityStop[];
  /* An ISO 8601 string, not a number. The column is a unix timestamp, but drizzle's
   * `mode: 'timestamp'` hands back a Date and JSON serialises that as a string. */
  createdAt: string;
};

export type CityRouteItem = CityRow & {
  titleMn: string;
  titleEn: string;
  summaryMn: string | null;
  summaryEn: string | null;
  stops: CityStop[];
  createdAt: string;
};

export type CityFood = CityRow & {
  nameMn: string;
  nameEn: string;
  categoryMn: string | null;
  categoryEn: string | null;
  knownForMn: string | null;
  knownForEn: string | null;
  /** The district or street address. */
  areaMn: string | null;
  areaEn: string | null;
  priceLevel: PriceLevel | null;
  createdAt: string;
};

export type CityTip = CityRow & {
  topic: TipTopic;
  titleMn: string;
  titleEn: string;
  bodyMn: string;
  bodyEn: string;
  createdAt: string;
};

export type Phrase = CityRow & {
  phraseMn: string;
  /** How to say it, in Latin letters. */
  pronunciation: string;
  meaningEn: string;
  category: PhraseCategory;
};

export type CityEvent = CityRow & {
  titleMn: string;
  titleEn: string;
  /** YYYY-MM-DD. */
  startDate: string;
  /** Null for a single-day event. */
  endDate: string | null;
  placeMn: string | null;
  placeEn: string | null;
  descriptionMn: string | null;
  descriptionEn: string | null;
  link: string | null;
  createdAt: string;
};

export const getCityItineraries = (days?: ItineraryDays) =>
  list<CityItinerary>(`/api/city/itineraries${days ? `?days=${days}` : ''}`);

export const getCityRoutes = () => list<CityRouteItem>('/api/city/routes');

export const getCityFood = () => list<CityFood>('/api/city/food');

export const getCityTips = () => list<CityTip>('/api/city/tips');

export const getPhrases = () => list<Phrase>('/api/city/phrases');

/** Published events that have not finished yet, soonest first — the API does the filtering. */
export const getCityEvents = () => list<CityEvent>('/api/city/events');

export const getCityItinerary = (id: number) =>
  one<CityItinerary>(`/api/city/itineraries/${id}`);

export const getCityRoute = (id: number) => one<CityRouteItem>(`/api/city/routes/${id}`);
