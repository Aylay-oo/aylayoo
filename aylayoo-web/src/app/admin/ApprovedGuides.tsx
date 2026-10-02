'use client';

import { useCallback, useState } from 'react';
import { ApiError, type Aimag } from '../../lib/api';
import {
  ADMIN_TYPE_LABEL, getAdminGuides, setGuideAssignment, type AdminGuide,
} from '../../lib/admin-api';
import { avatarColor, badgeClass, initials, languageLabel } from '../../lib/format';
import { useResource } from '../../lib/use-resource';
import { experienceOf } from './PendingGuides';

/* The approved guides, and the one thing about them an admin can change.
 *
 * The tourism association's roster arrives with names, phones, emails, languages and
 * experience — and no aimags or trip types, because it does not record them. Without an aimag
 * a guide still appears in the site's carousel but can never be recommended by the map, which
 * matches on province. So this screen exists to fill those two in.
 *
 * Nothing else is editable here on purpose: the rest of a guide's details belong to the guide.
 */

const TRIP_TYPES = [
  { key: 'countryside' as const, label: 'Хөдөөгийн аялал' },
  { key: 'city' as const, label: 'Хотын аялал' },
];

export function ApprovedGuides({
  token, aimags, onUnauthorized,
}: { token: string; aimags: Aimag[]; onUnauthorized: () => void }) {
  const fetcher = useCallback(() => getAdminGuides(token, 'approved'), [token]);
  const approved = useResource(fetcher);
  const [editing, setEditing] = useState<number | null>(null);

  if (approved.loading) return <p className="admin-muted">Ачаалж байна…</p>;

  if (approved.error) {
    return (
      <div className="notice">
        <span>{approved.error}</span>
        <button type="button" onClick={approved.reload}>Дахин оролдох</button>
      </div>
    );
  }

  const guides = approved.data ?? [];
  const missingAimags = guides.filter((guide) => guide.aimags.length === 0).length;

  return (
    <>
      <div className="admin-bar">
        <span className="found">{guides.length} баталгаажсан хөтөч</span>
        {/* The number worth acting on: these are the guides the map cannot recommend yet. */}
        {missingAimags > 0 && (
          <span className="admin-muted">{missingAimags} хөтөчид аймаг заагаагүй</span>
        )}
        <button className="btn btn-soft admin-refresh" type="button" onClick={approved.reload}>
          Шинэчлэх
        </button>
      </div>

      {guides.length === 0 ? (
        <div className="empty">Баталгаажсан хөтөч одоохондоо алга.</div>
      ) : (
        <div className="admin-grid">
          {guides.map((guide) => (
            <GuideRow
              key={guide.id}
              guide={guide}
              aimags={aimags}
              token={token}
              editing={editing === guide.id}
              onEdit={() => setEditing(guide.id)}
              onDone={() => setEditing(null)}
              onUnauthorized={onUnauthorized}
              onSaved={approved.reload}
            />
          ))}
        </div>
      )}
    </>
  );
}

type GuideRowProps = {
  guide: AdminGuide;
  aimags: Aimag[];
  token: string;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onSaved: () => void;
  onUnauthorized: () => void;
};

function GuideRow({
  guide, aimags, token, editing, onEdit, onDone, onSaved, onUnauthorized,
}: GuideRowProps) {
  /* Local copies while editing, so Cancel really cancels and a failed save does not leave the
   * card showing something the database does not have. */
  const [aimagIds, setAimagIds] = useState<number[]>(() => guide.aimags.map((a) => a.id));
  const [tripTypes, setTripTypes] = useState<('city' | 'countryside')[]>(() => guide.tripTypes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    // Reset from the guide each time, in case it changed since the last edit.
    setAimagIds(guide.aimags.map((a) => a.id));
    setTripTypes(guide.tripTypes);
    setError(null);
    onEdit();
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await setGuideAssignment(token, guide.id, { aimagIds, tripTypes });
      onDone();
      onSaved();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) return onUnauthorized();
      setError(cause instanceof ApiError ? cause.message : 'Хадгалж чадсангүй');
    } finally {
      setBusy(false);
    }
  }

  const toggle = <T,>(list: T[], value: T): T[] =>
    (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const experience = experienceOf(guide);

  return (
    <article className="g-card admin-card">
      <div className="g-top">
        <div className="g-av" style={{ background: avatarColor(guide.name) }} aria-hidden="true">
          {initials(guide.name)}
        </div>
        <div>
          <b>{guide.name}</b>
          <span className={`badge ${badgeClass(guide.type)}`}>{ADMIN_TYPE_LABEL[guide.type]}</span>
        </div>
      </div>

      <dl className="admin-rows">
        {/* Only rows with something in them, since the roster leaves most of these empty. */}
        <dt>Утас</dt>
        <dd><a href={`tel:${guide.phone}`}>{guide.phone}</a></dd>

        <dt>Имэйл</dt>
        <dd><a href={`mailto:${guide.email}`}>{guide.email}</a></dd>

        {guide.languages.length > 0 && (
          <>
            <dt>Хэл</dt>
            <dd>{languageLabel(guide.languages)}</dd>
          </>
        )}

        {experience && (
          <>
            <dt>Туршлага</dt>
            <dd>{experience}</dd>
          </>
        )}

        {!editing && (
          <>
            <dt>Аймгууд</dt>
            <dd>
              {guide.aimags.length > 0
                ? guide.aimags.map((aimag) => aimag.nameMn).join(', ')
                : <span className="admin-unset">заагаагүй</span>}
            </dd>

            <dt>Аяллын төрөл</dt>
            <dd>
              {guide.tripTypes.length > 0
                ? guide.tripTypes
                  .map((kind) => TRIP_TYPES.find((t) => t.key === kind)?.label ?? kind)
                  .join(', ')
                : <span className="admin-unset">заагаагүй</span>}
            </dd>
          </>
        )}
      </dl>

      {editing ? (
        <div className="admin-edit">
          <span className="fld"><span>Ажилладаг аймгууд</span></span>
          <div className="pick scroll" role="group" aria-label={`${guide.name}: ажилладаг аймгууд`}>
            {aimags.map((aimag) => (
              <button
                key={aimag.id}
                type="button"
                aria-pressed={aimagIds.includes(aimag.id)}
                onClick={() => setAimagIds((current) => toggle(current, aimag.id))}
              >
                {aimag.nameMn}
              </button>
            ))}
          </div>

          <span className="fld"><span>Аяллын төрөл</span></span>
          <div className="pick" role="group" aria-label={`${guide.name}: аяллын төрөл`}>
            {TRIP_TYPES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={tripTypes.includes(key)}
                onClick={() => setTripTypes((current) => toggle(current, key))}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="fld-error" role="alert">{error}</p>}

          <div className="admin-actions">
            <button className="btn btn-plain" type="button" onClick={onDone} disabled={busy}>
              Болих
            </button>
            <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>
              {busy ? 'Хадгалж байна…' : 'Хадгалах'}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-actions">
          <button className="btn btn-soft" type="button" onClick={startEditing}>
            Аймаг & төрөл засах
          </button>
        </div>
      )}
    </article>
  );
}
