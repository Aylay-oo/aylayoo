'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '../../../lib/api';
import {
  deleteTripRequest, getTripRequests, setTripRequestStatus,
  type AdminTripRequest, type RequestStatus,
} from '../../../lib/admin-api';
import { useResource } from '../../../lib/use-resource';
import { ErasureLookup } from './ErasureLookup';

/* The relay: trip requests, and moving each one along by hand.
 *
 * In R1a there is no email and guides have no portal, so a request reaches a guide because an
 * admin rings them. That makes the *state* of the relay the most important thing on this
 * screen — a request that looks delivered and is not is the worst outcome of the whole
 * feature, worse than one that is obviously still waiting.
 *
 * So the states are spelled out as what has actually happened, in order:
 *
 *   Шинэ       nobody has rung the guide yet
 *   Дамжуулсан the guide has been told, and has not answered
 *   Хүлээсэн   the guide said yes — and ONLY now does the traveller's contact appear
 *   Татгалзсан / Болсон / Цуцалсан  closed, three ways
 *
 * The contact staging is enforced by the API, not here: GET /api/admin/trip-requests omits
 * `email` and `phone` until `acceptedAt` is set, and sends `contactWithheld: true` instead.
 * This screen explains the gap; it does not create it. A field a screen is trusted to hide is
 * a field that leaks the first time somebody adds an export or a second screen — see the note
 * at the top of aylayoo-service/src/routes/admin-trips.ts.
 *
 * Which is also why `contactWithheld` is what the markup branches on, rather than whether the
 * fields are empty: absent and empty mean different things, and only one of them means "we are
 * not telling you yet".
 */

const STATUS: Record<RequestStatus, { label: string; hint: string; className: string }> = {
  new: {
    label: 'Шинэ',
    hint: 'Хөтөчтэй холбогдоогүй байна.',
    className: 'badge driver',
  },
  relayed: {
    label: 'Дамжуулсан',
    hint: 'Хөтөчид хүргэсэн. Хариу хүлээгдэж байна.',
    className: 'badge guide',
  },
  accepted: {
    label: 'Хүлээсэн',
    hint: 'Хөтөч зөвшөөрсөн. Холбоо барих хаягийг хуваалцаж болно.',
    className: 'tag',
  },
  declined: { label: 'Татгалзсан', hint: 'Хөтөч татгалзсан.', className: 'admin-unset' },
  completed: { label: 'Болсон', hint: 'Аялал болсон.', className: 'admin-unset' },
  cancelled: { label: 'Цуцалсан', hint: 'Хүсэлт цуцлагдсан.', className: 'admin-unset' },
};

/** What an admin can do next, given where the request is now. */
const NEXT: Record<RequestStatus, readonly RequestStatus[]> = {
  new: ['relayed', 'cancelled'],
  relayed: ['accepted', 'declined', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  declined: ['relayed'],
  completed: [],
  cancelled: ['new'],
};

const when = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('mn-MN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(date);
};

const dates = (request: AdminTripRequest) => {
  if (request.preferredFrom && request.preferredTo) {
    return `${request.preferredFrom} – ${request.preferredTo}`;
  }
  return request.preferredFrom || request.preferredTo || '';
};

export function RequestsTab({ token, onUnauthorized }: {
  token: string;
  onUnauthorized: () => void;
}) {
  const fetcher = useCallback(() => getTripRequests(token), [token]);
  const requests = useResource(fetcher);
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
      requests.reload();
    } catch (cause) {
      handle(cause);
    } finally {
      setBusy(false);
    }
  }

  if (requests.loading) return <p className="admin-muted">Ачаалж байна…</p>;

  if (requests.error) {
    return (
      <div className="notice">
        <span>{requests.error}</span>
        <button type="button" onClick={requests.reload}>Дахин оролдох</button>
      </div>
    );
  }

  const rows = requests.data ?? [];
  /* The two numbers worth acting on: nobody has rung the guide, or the guide has not answered
   * yet. Everything else is either done or waiting on somebody who has been asked. */
  const waiting = rows.filter((row) => row.status === 'new').length;
  const relayed = rows.filter((row) => row.status === 'relayed').length;

  return (
    <>
      <div className="admin-bar">
        <span className="found">{rows.length} хүсэлт</span>
        {waiting > 0 && <span className="admin-warn">{waiting} дамжуулаагүй</span>}
        {relayed > 0 && <span className="admin-muted">{relayed} хариу хүлээж байна</span>}
        <button className="btn btn-soft admin-refresh" type="button" onClick={requests.reload}>
          Шинэчлэх
        </button>
      </div>

      {error && <p className="fld-error" role="alert">{error}</p>}

      {rows.length === 0 ? (
        <div className="empty">Хүсэлт одоохондоо алга.</div>
      ) : (
        <div className="admin-rows">
          {rows.map((request) => {
            const state = STATUS[request.status];

            return (
              <div className="admin-card admin-request" key={request.id}>
                <div className="admin-city-top">
                  <span className={state.className}>{state.label}</span>
                  <b>{request.travellerName}</b>
                  <code className="trip-ref">{request.referenceFormatted}</code>
                  <time dateTime={request.createdAt}>{when(request.createdAt)}</time>
                </div>

                <p className="admin-muted">{state.hint}</p>

                <span className="admin-muted">
                  {[
                    request.tourTitleMn,
                    request.guide.name ? `Хөтөч: ${request.guide.name}` : null,
                    request.partySize != null ? `${request.partySize} хүн` : null,
                    dates(request),
                  ].filter(Boolean).join(' · ')}
                </span>

                {/* Whitespace preserved: people write these in lines. */}
                <p className="admin-body">{request.message}</p>

                {/* The guide's own contact — how the admin relays at all. Admin-only
                    everywhere in this service, and never the traveller's. */}
                {(request.guide.phone || request.guide.email) && (
                  <p className="admin-subject">
                    Хөтөчтэй холбогдох:{' '}
                    {request.guide.phone && (
                      <a href={`tel:${request.guide.phone}`}>{request.guide.phone}</a>
                    )}
                    {request.guide.phone && request.guide.email && ' · '}
                    {request.guide.email && (
                      <a href={`mailto:${request.guide.email}`}>{request.guide.email}</a>
                    )}
                  </p>
                )}

                {/* The traveller's contact, or the reason it is not here yet. Branches on
                    contactWithheld, which the API sets — not on the fields being empty. */}
                {request.contactWithheld ? (
                  <p className="admin-warn" role="note">
                    Аялагчийн холбоо барих хаяг хараахан харагдахгүй. Хөтөч хүсэлтийг хүлээн
                    авсны дараа “Хүлээсэн” гэж бүртгэвэл гарч ирнэ.
                  </p>
                ) : (
                  <p className="admin-subject">
                    Аялагчтай холбогдох:{' '}
                    {request.phone && <a href={`tel:${request.phone}`}>{request.phone}</a>}
                    {request.phone && request.email && ' · '}
                    {request.email && <a href={`mailto:${request.email}`}>{request.email}</a>}
                    {!request.phone && !request.email && '—'}
                  </p>
                )}

                <div className="admin-actions">
                  {NEXT[request.status].map((next) => (
                    <button
                      key={next}
                      className="btn btn-soft"
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => setTripRequestStatus(token, request.id, next))}
                    >
                      {STATUS[next].label} гэж бүртгэх
                    </button>
                  ))}

                  <button
                    className="btn btn-soft admin-danger"
                    type="button"
                    disabled={busy}
                    /* One button for spam and for an honoured erasure request. Spam is not a
                       status: keeping a stranger's phone number on file in order to label them
                       a spammer is the wrong trade. */
                    onClick={() => {
                      if (window.confirm(
                        `${request.referenceFormatted} устгах уу? Аялагчийн мэдээлэл бүрмөсөн`
                        + ' устана.',
                      )) {
                        void run(() => deleteTripRequest(token, request.id));
                      }
                    }}
                  >
                    Устгах
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ErasureLookup token={token} onUnauthorized={onUnauthorized} onDeleted={requests.reload} />
    </>
  );
}
