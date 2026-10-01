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
  phone: string;
  email: string;
  photoUrl: string | null;
  website: string | null;
  /* An ISO 8601 string, not a number. The column is a unix timestamp, but drizzle's
   * `mode: 'timestamp'` hands back a Date and JSON serialises that as a string — verified
   * against the running Worker. */
  createdAt: string;
  experienceYears: number | null;
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

export async function getGuides(options: { type?: GuideType; aimag?: string[] } = {}) {
  const query = new URLSearchParams({ limit: String(GUIDES_PAGE_LIMIT) });
  if (options.type) query.set('type', options.type);
  if (options.aimag?.length) query.set('aimag', options.aimag.join(','));
  return request<{ data: Guide[]; pagination: Pagination }>(`/api/guides?${query}`);
}

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
