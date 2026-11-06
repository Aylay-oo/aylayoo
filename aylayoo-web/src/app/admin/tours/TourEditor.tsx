'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '../../../lib/api';
import {
  createTour, deleteTour, getAdminGuides, getAdminTours, updateTour, type AdminTour,
} from '../../../lib/admin-api';
import { useResource } from '../../../lib/use-resource';
import { TourForm } from './TourForm';

/* The tours list, and everything an admin can do to one.
 *
 * Not built on CityEditor, although it looks like it: a tour needs a check that the generic
 * CRUD factory knows nothing about. Publishing is refused with a 409 unless the guide is
 * approved AND has active `tours` consent, and the useful thing for this screen to do is say so
 * BEFORE the admin presses the button — the API returns `guideStatus` and
 * `guideConsentScopes` on every row for exactly that.
 *
 * The API is still the boundary. This screen disables the button and explains why; it does not
 * decide anything. If the two ever disagree, the server wins and the 409 is shown as-is.
 */

const STATUS_LABEL = { draft: 'Нооруулга', published: 'Нийтэлсэн' } as const;

/** Why this tour cannot be published, or null if it can. */
export function publishBlockedReason(tour: AdminTour): string | null {
  if (tour.guideStatus !== 'approved') {
    return `Хөтөч "${tour.guideStatus ?? 'байхгүй'}" төлөвт байна — баталгаажуулсны дараа нийтэлнэ.`;
  }
  if (!tour.guideConsentScopes.includes('tours')) {
    return 'Хөтөч аялал нийтлэх зөвшөөрөл өгөөгүй. "Хөтчийн зөвшөөрөл" хэсэгт бүртгэнэ үү.';
  }
  return null;
}

export function TourEditor({ token, onUnauthorized }: {
  token: string;
  onUnauthorized: () => void;
}) {
  const fetcher = useCallback(() => getAdminTours(token), [token]);
  const tours = useResource(fetcher);
  /* The guide picker's options. Approved only: a tour cannot be published for a guide who is
   * not approved, so offering the others would be inviting a draft that can never go live. */
  const guidesFetcher = useCallback(() => getAdminGuides(token, 'approved'), [token]);
  const guides = useResource(guidesFetcher);

  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = (cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      onUnauthorized();
      return;
    }
    setError(cause instanceof ApiError ? cause.message : 'Үйлдэл хийхэд алдаа гарлаа');
  };

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      tours.reload();
    } catch (cause) {
      handle(cause);
    } finally {
      setBusy(false);
    }
  }

  if (tours.loading) return <p className="admin-muted">Ачаалж байна…</p>;

  if (tours.error) {
    return (
      <div className="notice">
        <span>{tours.error}</span>
        <button type="button" onClick={tours.reload}>Дахин оролдох</button>
      </div>
    );
  }

  const list = tours.data ?? [];
  const drafts = list.filter((tour) => tour.status === 'draft').length;

  return (
    <>
      <div className="admin-bar">
        <span className="found">{list.length} аялал</span>
        {drafts > 0 && <span className="admin-muted">{drafts} нооруулга</span>}
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setEditing('new')}
          disabled={editing === 'new'}
        >
          + Шинэ аялал
        </button>
        <button className="btn btn-soft admin-refresh" type="button" onClick={tours.reload}>
          Шинэчлэх
        </button>
      </div>

      {error && <p className="fld-error" role="alert">{error}</p>}

      {editing === 'new' && (
        <TourForm
          tour={null}
          guides={guides.data ?? []}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (payload) => {
            await run(async () => {
              await createTour(token, payload);
              setEditing(null);
            });
          }}
        />
      )}

      {list.length === 0 ? (
        <div className="empty">Аялал бүртгэгдээгүй байна.</div>
      ) : (
        <div className="admin-rows">
          {list.map((tour) => {
            const blocked = publishBlockedReason(tour);

            return (
              <div className="admin-card admin-city-card" key={tour.id}>
                <div className="admin-city-top">
                  <b>{tour.titleMn || `#${tour.id}`}</b>
                  <span className={tour.status === 'published' ? 'tag' : 'admin-unset'}>
                    {STATUS_LABEL[tour.status]}
                  </span>
                </div>

                <span className="admin-muted">
                  {[
                    tour.guideName ?? `#${tour.guideId}`,
                    tour.durationMinutes != null ? `${tour.durationMinutes} мин` : null,
                    `${tour.stops.length} зогсоол`,
                  ].filter(Boolean).join(' · ')}
                </span>

                {/* Said on the row, not hidden behind a failed click. A draft that cannot be
                    published is the normal state of a new tour, and the admin needs to know
                    which of the two reasons it is. */}
                {blocked && tour.status === 'draft' && (
                  <p className="admin-warn" role="note">{blocked}</p>
                )}

                <div className="admin-actions">
                  <button
                    className="btn btn-soft"
                    type="button"
                    onClick={() => setEditing(editing === tour.id ? null : tour.id)}
                  >
                    {editing === tour.id ? 'Хаах' : 'Засах'}
                  </button>

                  <button
                    className="btn btn-soft"
                    type="button"
                    /* Disabled only for publishing. Unpublishing is always allowed — taking a
                       tour down must never be blocked by the same check that keeps it from
                       going up. */
                    disabled={busy || (tour.status === 'draft' && blocked !== null)}
                    title={tour.status === 'draft' && blocked ? blocked : undefined}
                    onClick={() => run(() => updateTour(token, tour.id, {
                      status: tour.status === 'published' ? 'draft' : 'published',
                    }))}
                  >
                    {tour.status === 'published' ? 'Нийтлэхээ болих' : 'Нийтлэх'}
                  </button>

                  <button
                    className="btn btn-soft admin-danger"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const name = tour.titleMn || `#${tour.id}`;
                      if (window.confirm(`"${name}" устгах уу? Үүнийг буцаах боломжгүй.`)) {
                        void run(() => deleteTour(token, tour.id));
                      }
                    }}
                  >
                    Устгах
                  </button>
                </div>

                {editing === tour.id && (
                  <TourForm
                    tour={tour}
                    guides={guides.data ?? []}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={async (payload) => {
                      await run(async () => {
                        await updateTour(token, tour.id, payload);
                        setEditing(null);
                      });
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
