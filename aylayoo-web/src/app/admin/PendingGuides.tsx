'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { ApiError, imageUrl } from '../../lib/api';
import { ADMIN_TYPE_LABEL, getAdminGuides, setGuideStatus, type AdminGuide } from '../../lib/admin-api';
import { avatarColor, badgeClass, initials, languageLabel } from '../../lib/format';
import { useResource } from '../../lib/use-resource';

/* Registrations waiting for a decision.
 *
 * Everything a reviewer needs to judge one is on the card — photo, type, provinces,
 * languages, phone and email — because the alternative is approving people on faith.
 */

/** The band from the roster, or the number from a self-registration, or nothing. */
export function experienceOf(guide: AdminGuide): string | null {
  if (guide.experienceRange) return guide.experienceRange;
  return guide.experienceYears !== null ? `${guide.experienceYears} жил` : null;
}

export function PendingGuides({
  token, onUnauthorized,
}: { token: string; onUnauthorized: () => void }) {
  const fetcher = useCallback(() => getAdminGuides(token, 'pending'), [token]);
  const pending = useResource(fetcher);
  /** Which rows are mid-decision, so their buttons can be disabled individually. */
  const [busy, setBusy] = useState<ReadonlySet<number>>(new Set());
  const [decided, setDecided] = useState<Record<number, 'approved' | 'rejected'>>({});
  const [error, setError] = useState<string | null>(null);

  async function decide(guide: AdminGuide, status: 'approved' | 'rejected') {
    if (busy.has(guide.id)) return;
    setBusy((current) => new Set(current).add(guide.id));
    setError(null);
    try {
      await setGuideStatus(token, guide.id, status);
      // Kept on screen with its outcome rather than vanishing, so the reviewer can see what
      // they just did — and catch an approval they did not mean.
      setDecided((current) => ({ ...current, [guide.id]: status }));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) return onUnauthorized();
      setError(cause instanceof ApiError ? cause.message : 'Хадгалж чадсангүй');
    } finally {
      setBusy((current) => {
        const next = new Set(current);
        next.delete(guide.id);
        return next;
      });
    }
  }

  if (pending.loading) return <p className="admin-muted">Ачаалж байна…</p>;

  if (pending.error) {
    return (
      <div className="notice">
        <span>{pending.error}</span>
        <button type="button" onClick={pending.reload}>Дахин оролдох</button>
      </div>
    );
  }

  const guides = pending.data ?? [];
  const waiting = guides.filter((guide) => !decided[guide.id]);

  return (
    <>
      <div className="admin-bar">
        <span className="found">{waiting.length} хүсэлт хүлээгдэж байна</span>
        <button className="btn btn-soft admin-refresh" type="button" onClick={pending.reload}>
          Шинэчлэх
        </button>
      </div>

      {error && <p className="fld-error" role="alert">{error}</p>}

      {guides.length === 0 ? (
        <div className="empty">Хүлээгдэж байгаа бүртгэл одоохондоо алга.</div>
      ) : (
        <div className="admin-grid">
          {guides.map((guide) => {
            const photo = imageUrl(guide.photoUrl);
            const outcome = decided[guide.id];

            return (
              <article className={outcome ? 'g-card admin-card done' : 'g-card admin-card'} key={guide.id}>
                <div className="g-top">
                  {photo ? (
                    <Image
                      className="g-av"
                      src={photo}
                      alt={guide.name}
                      width={50}
                      height={50}
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div className="g-av" style={{ background: avatarColor(guide.name) }} aria-hidden="true">
                      {initials(guide.name)}
                    </div>
                  )}
                  <div>
                    <b>{guide.name}</b>
                    <span className={`badge ${badgeClass(guide.type)}`}>
                      {ADMIN_TYPE_LABEL[guide.type]}
                    </span>
                  </div>
                </div>

                <dl className="admin-rows">
                  <dt>Утас</dt>
                  <dd><a href={`tel:${guide.phone}`}>{guide.phone}</a></dd>

                  <dt>Имэйл</dt>
                  <dd><a href={`mailto:${guide.email}`}>{guide.email}</a></dd>

                  {/* Rows with nothing in them are left out rather than printed with a
                      dash: the association's roster has no aimags, trip types, route, bio or
                      photo, so half of these would otherwise be empty labels on every card. */}
                  {guide.type === 'driver' && guide.car && (
                    <>
                      <dt>Машин</dt>
                      <dd>{guide.car}</dd>
                    </>
                  )}

                  {guide.type !== 'driver' && guide.languages.length > 0 && (
                    <>
                      <dt>Хэл</dt>
                      <dd>{languageLabel(guide.languages)}</dd>
                    </>
                  )}

                  {guide.aimags.length > 0 && (
                    <>
                      <dt>Аймгууд</dt>
                      <dd>{guide.aimags.map((aimag) => aimag.nameMn).join(', ')}</dd>
                    </>
                  )}

                  {experienceOf(guide) && (
                    <>
                      <dt>Туршлага</dt>
                      <dd>{experienceOf(guide)}</dd>
                    </>
                  )}

                  {guide.routeMn && (
                    <>
                      <dt>Чиглэл</dt>
                      <dd>{guide.routeMn}</dd>
                    </>
                  )}

                  {guide.website && (
                    <>
                      <dt>Вэб</dt>
                      <dd>
                        <a href={guide.website} target="_blank" rel="noreferrer noopener">
                          {guide.website}
                        </a>
                      </dd>
                    </>
                  )}

                  {guide.bioMn && (
                    <>
                      <dt>Танилцуулга</dt>
                      <dd>{guide.bioMn}</dd>
                    </>
                  )}
                </dl>

                {outcome ? (
                  <p className={outcome === 'approved' ? 'admin-outcome ok' : 'admin-outcome no'}>
                    {outcome === 'approved' ? 'Баталгаажлаа' : 'Татгалзлаа'}
                  </p>
                ) : (
                  <div className="admin-actions">
                    <button
                      className="btn btn-plain"
                      type="button"
                      disabled={busy.has(guide.id)}
                      onClick={() => decide(guide, 'rejected')}
                    >
                      Татгалзах
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={busy.has(guide.id)}
                      onClick={() => decide(guide, 'approved')}
                    >
                      {busy.has(guide.id) ? 'Хадгалж байна…' : 'Баталгаажуулах'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
