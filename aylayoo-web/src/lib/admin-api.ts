/* The admin side of aylayoo-service.
 *
 * Kept apart from api.ts because everything here needs a bearer token and none of it is
 * reachable from the public site. The token is held in sessionStorage — see useAdminToken
 * below for why that, and not localStorage or a cookie.
 */

import { API_URL, ApiError, type Guide, type GuideType } from './api';

/** An 8-hour token from POST /api/admin/login. */
export type AdminToken = string;

/** A pending registration carries its status, which the public list strips out. */
export type AdminGuide = Guide & { status: 'pending' | 'approved' | 'rejected' };

export type ContactMessage = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  /** ISO 8601, for the same reason as Guide.createdAt. */
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
