/* The admin side of aylayoo-service.
 *
 * Kept apart from api.ts because everything here needs a bearer token and none of it is
 * reachable from the public site. The token is held in sessionStorage — see useAdminToken
 * below for why that, and not localStorage or a cookie.
 */

import { API_URL, ApiError, type CityStatus, type Guide, type GuideType } from './api';

/** An 8-hour token from POST /api/admin/login. */
export type AdminToken = string;

/* What the admin API returns for a guide: the public shape, plus the three fields only an
 * admin may see. `status` drives the review queue; `phone` and `email` are how the team reaches
 * a guide, and are deliberately absent from the public `Guide` type and from every public
 * endpoint. */
export type AdminGuide = Guide & {
  status: 'pending' | 'approved' | 'rejected';
  phone: string;
  email: string;
  /** The association's full legal form of the name. Admin-only, like the contact details. */
  fullName: string | null;
  /** ISO 8601 — see the note on ContactMessage.createdAt. */
  createdAt: string;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  /* An ISO 8601 string, not a number: the column is a unix timestamp, but drizzle's
   * `mode: 'timestamp'` hands back a Date and JSON serialises that as a string. */
  createdAt: string;
  guideId: number | null;
  subject: string | null;
  kind: 'contact' | 'booking';
};

async function adminRequest<T>(
  path: string,
  token: AdminToken,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new ApiError('Сервертэй холбогдож чадсангүй');
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      message = ((await response.json()) as { error?: string }).error;
    } catch {
      // Not JSON; the status is all there is to go on.
    }
    // 401 is its own case: the caller signs out rather than showing an error, because an
    // expired token cannot be recovered from by retrying.
    throw new ApiError(message || `Сервер ${response.status} хариу буцаалаа`, response.status);
  }

  return (await response.json()) as T;
}

export async function adminLogin(email: string, password: string): Promise<AdminToken> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError('Сервертэй холбогдож чадсангүй');
  }

  const body = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!response.ok || !body.token) {
    // The API answers a wrong email and a wrong password identically, and so does this.
    throw new ApiError(body.error || 'Имэйл эсвэл нэвтрэх үг буруу', response.status);
  }
  return body.token;
}

export const getAdminGuides = (token: AdminToken, status: 'pending' | 'approved' | 'rejected') =>
  adminRequest<{ data: AdminGuide[] }>(`/api/admin/guides?status=${status}`, token)
    .then((r) => r.data);

/* Fills in what the tourism association's roster does not record. `aimagIds` REPLACES the
 * guide's whole set, so the editor can send what its checkboxes show and an unticked aimag
 * actually goes away. Either field may be sent alone. */
export const setGuideAssignment = (
  token: AdminToken,
  id: number,
  input: { aimagIds?: number[]; tripTypes?: ('city' | 'countryside')[] },
) => adminRequest<{ data: AdminGuide }>(
  `/api/admin/guides/${id}`,
  token,
  { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
).then((r) => r.data);

export const setGuideStatus = (
  token: AdminToken,
  id: number,
  status: 'approved' | 'rejected',
) => adminRequest<{ data: { id: number; status: string } }>(
  `/api/admin/guides/${id}/status`,
  token,
  { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) },
);

/** Already newest-first: the API orders by created_at descending. */
export const getMessages = (token: AdminToken) =>
  adminRequest<{ data: ContactMessage[] }>('/api/admin/messages', token).then((r) => r.data);

/** What each guide type is called on the admin screen. */
export const ADMIN_TYPE_LABEL: Record<GuideType, string> = {
  individual: 'Хувь хөтөч',
  driver: 'Жолооч',
  company: 'Аяллын компани',
};

/* ---------------------------------------------------------------------------
 * Phase 2 — the Ulaanbaatar city section.
 *
 * Six resources, one set of calls. The server side is generated the same way (see
 * registerCityCrud in aylayoo-service/src/lib/crud.ts), so the shapes match by construction
 * rather than by six pairs of hand-written functions agreeing with each other.
 *
 * Everything goes through adminRequest, so 401 handling and error phrasing are identical to
 * the guide screens: an expired token signs the admin out rather than showing an error.
 * ------------------------------------------------------------------------- */

export type CityKind = 'itineraries' | 'routes' | 'food' | 'tips' | 'phrases' | 'events';

/* A city row as the admin screen handles it: the three fields every resource shares, plus
 * whatever else its table has. Loosely typed on purpose — this screen is field-driven (see
 * admin/city/resources.ts), so it reads and writes columns by name. The server's Zod schema is
 * what decides whether a payload is valid, and it answers with the field that was wrong. */
export type AdminCityRow = {
  id: number;
  status: CityStatus;
  sortOrder: number;
} & Record<string, unknown>;

/** Both statuses, newest schema order — this is the screen where a draft is reviewed. */
export const getAdminCity = (token: AdminToken, kind: CityKind) =>
  adminRequest<{ data: AdminCityRow[] }>(`/api/admin/city/${kind}`, token).then((r) => r.data);

const json = (body: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** A new row is a draft unless `input` says otherwise — the API defaults it, not this. */
export const createCityRow = (
  token: AdminToken,
  kind: CityKind,
  input: Record<string, unknown>,
) => adminRequest<{ data: AdminCityRow }>(
  `/api/admin/city/${kind}`,
  token,
  { method: 'POST', ...json(input) },
).then((r) => r.data);

/* Only the fields in `input` are changed; anything left out keeps its value. That is a property
 * of the API, not of this call — see the note above the city schemas in the service's
 * validators.ts for the bug that made it one. */
export const updateCityRow = (
  token: AdminToken,
  kind: CityKind,
  id: number,
  input: Record<string, unknown>,
) => adminRequest<{ data: AdminCityRow }>(
  `/api/admin/city/${kind}/${id}`,
  token,
  { method: 'PUT', ...json(input) },
).then((r) => r.data);

export const deleteCityRow = (token: AdminToken, kind: CityKind, id: number) =>
  adminRequest<{ message: string }>(`/api/admin/city/${kind}/${id}`, token, { method: 'DELETE' });

/** Publish or unpublish. A one-field update, which is exactly what the API expects. */
export const setCityStatus = (
  token: AdminToken,
  kind: CityKind,
  id: number,
  status: CityStatus,
) => updateCityRow(token, kind, id, { status });

/* The whole visible list of ids, in the order it should appear — not the pair that moved.
 * The request then describes the state the admin can see rather than a transition, and two
 * admins reordering at once cannot interleave into an order neither of them chose. The API
 * refuses the lot if any id is unknown. */
export const reorderCity = (token: AdminToken, kind: CityKind, ids: number[]) =>
  adminRequest<{ data: { ids: number[] } }>(
    `/api/admin/city/${kind}/reorder`,
    token,
    { method: 'PATCH', ...json({ ids }) },
  );
