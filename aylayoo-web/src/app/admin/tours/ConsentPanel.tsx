'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '../../../lib/api';
import {
  getAdminGuides, getGuideConsent, recordGuideConsent, revokeGuideConsent,
  type ConsentScope, type ConsentSource, type GuideConsent,
} from '../../../lib/admin-api';
import { useResource } from '../../../lib/use-resource';

/* Recording and revoking a guide's consent.
 *
 * The 50 guides on the roster were listed by their association, not signed up individually.
 * Being in a directory is not agreeing to have tours published under your name, and it is not
 * agreeing to be sent strangers' trip requests — so each of those is a scope a guide consents
 * to separately, and the service refuses to publish or to route without it.
 *
 * Three things this screen insists on, each because of how consent goes wrong in practice:
 *
 *   `source` — `guide` means the guide said so themselves; `association` means their
 *   association said so on their behalf. Association-wide consent is a starting point, not a
 *   substitute, and the difference has to be visible later or it is lost.
 *
 *   `evidenceNote` — how it was obtained, at least a few words ("phoned 2026-11-04, agreed to
 *   tours and requests"). The API requires it. Unevidenced consent is not consent, and six
 *   months from now the note is the only thing that answers "how do we know?".
 *
 *   Revoking does not delete. `revokedAt` is set and the row stays, because the history of a
 *   consent is part of the record — and revoking `tours` unpublishes that guide's tours in the
 *   same request, which this screen reports back as a count.
 */

const SCOPES: readonly { value: ConsentScope; label: string; hint: string }[] = [
  { value: 'tours', label: 'Аялал нийтлэх', hint: 'Нэр дээр нь аялал нийтлэхийг зөвшөөрсөн.' },
  { value: 'requests', label: 'Хүсэлт хүлээн авах', hint: 'Аяллын хүсэлт дамжуулахыг зөвшөөрсөн.' },
  { value: 'reviews', label: 'Үнэлгээ', hint: 'Үнэлгээ, сэтгэгдэл нийтлэхийг зөвшөөрсөн.' },
];

const SOURCES: readonly { value: ConsentSource; label: string }[] = [
  { value: 'guide', label: 'Хөтөч өөрөө' },
  { value: 'association', label: 'Холбоо' },
];

const scopeLabel = (scope: ConsentScope) =>
  SCOPES.find((entry) => entry.value === scope)?.label ?? scope;

const when = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(date);
};

export function ConsentPanel({ token, onUnauthorized }: {
  token: string;
  onUnauthorized: () => void;
}) {
  const consentFetcher = useCallback(() => getGuideConsent(token), [token]);
  const consent = useResource(consentFetcher);
  const guidesFetcher = useCallback(() => getAdminGuides(token, 'approved'), [token]);
  const guides = useResource(guidesFetcher);

  const [guideId, setGuideId] = useState('');
  const [scope, setScope] = useState<ConsentScope>('tours');
  const [source, setSource] = useState<ConsentSource>('guide');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    try {
      await action();
      consent.reload();
    } catch (cause) {
      handle(cause);
    } finally {
      setBusy(false);
    }
  }

  async function record(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guideId) {
      setError('Хөтөч сонгоно уу.');
      return;
    }
    /* The API's floor is 8 characters. Checked here too, so an admin is told before the round
     * trip — the message is the same thing the server would say. */
    if (evidenceNote.trim().length < 8) {
      setError('Зөвшөөрлийг хэрхэн авсныг бичнэ үү (хамгийн багадаа 8 тэмдэгт).');
      return;
    }

    await run(async () => {
      await recordGuideConsent(token, {
        guideId: Number(guideId),
        scope,
        source,
        evidenceNote: evidenceNote.trim(),
      });
      setEvidenceNote('');
      setNotice('Зөвшөөрөл бүртгэгдлээ.');
    });
  }

  function revoke(row: GuideConsent) {
    const name = guides.data?.find((guide) => guide.id === row.guideId)?.name
      ?? `#${row.guideId}`;
    /* The warning names the consequence rather than asking "are you sure?", because the
       consequence is the part an admin may not expect: the tours come down immediately. */
    const consequence = row.scope === 'tours'
      ? ' Энэ хөтчийн нийтэлсэн аялал бүгд нийтлэгдэхээ болино.'
      : '';
    if (!window.confirm(`${name}: "${scopeLabel(row.scope)}" зөвшөөрлийг цуцлах уу?${consequence}`)) {
      return;
    }

    void run(async () => {
      const result = await revokeGuideConsent(token, row.id);
      setNotice(result.toursUnpublished > 0
        ? `Цуцлагдлаа. ${result.toursUnpublished} аялал нийтлэгдэхээ больсон.`
        : 'Цуцлагдлаа.');
    });
  }

  const rows = consent.data ?? [];
  const active = rows.filter((row) => row.revokedAt === null);
  const revoked = rows.filter((row) => row.revokedAt !== null);
  const nameOf = (id: number) =>
    guides.data?.find((guide) => guide.id === id)?.name ?? `#${id}`;

  return (
    <>
      <form className="admin-form" onSubmit={record}>
        <h3>Зөвшөөрөл бүртгэх</h3>

        <label className="fld">
          <span>Хөтөч</span>
          <select value={guideId} onChange={(e) => setGuideId(e.target.value)} required>
            <option value="">— сонгох —</option>
            {(guides.data ?? []).map((guide) => (
              <option key={guide.id} value={guide.id}>
                {guide.name} (#{guide.id})
              </option>
            ))}
          </select>
        </label>

        <label className="fld">
          <span>Юунд</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as ConsentScope)}>
            {SCOPES.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
          <small className="fld-hint">
            {SCOPES.find((entry) => entry.value === scope)?.hint}
          </small>
        </label>

        <label className="fld">
          <span>Хэнээс</span>
          <select value={source} onChange={(e) => setSource(e.target.value as ConsentSource)}>
            {SOURCES.map((entry) => (
              <option key={entry.value} value={entry.value}>{entry.label}</option>
            ))}
          </select>
          <small className="fld-hint">
            Холбооны зөвшөөрөл нь хөтчийн өөрийн зөвшөөрлийг бүрэн орлохгүй.
          </small>
        </label>

        <label className="fld">
          <span>Хэрхэн авсан</span>
          <textarea
            rows={2}
            value={evidenceNote}
            onChange={(e) => setEvidenceNote(e.target.value)}
            placeholder="Жишээ: 2026-11-04-нд утсаар тохиролцов."
            required
            minLength={8}
          />
          <small className="fld-hint">Хэзээ, хэрхэн, хэнтэй. Дараа нь үүнээс өөр баримт байхгүй.</small>
        </label>

        {error && <p className="fld-error" role="alert">{error}</p>}
        {notice && <p className="admin-ok" role="status">{notice}</p>}

        <div className="admin-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Бүртгэж байна…' : 'Бүртгэх'}
          </button>
        </div>
      </form>

      <div className="admin-bar">
        <span className="found">{active.length} хүчинтэй зөвшөөрөл</span>
        {revoked.length > 0 && <span className="admin-muted">{revoked.length} цуцалсан</span>}
        <button className="btn btn-soft admin-refresh" type="button" onClick={consent.reload}>
          Шинэчлэх
        </button>
      </div>

      {consent.loading && <p className="admin-muted">Ачаалж байна…</p>}

      {consent.error && (
        <div className="notice">
          <span>{consent.error}</span>
          <button type="button" onClick={consent.reload}>Дахин оролдох</button>
        </div>
      )}

      {!consent.loading && rows.length === 0 && (
        <div className="empty">Зөвшөөрөл бүртгэгдээгүй байна.</div>
      )}

      {rows.length > 0 && (
        <div className="admin-rows">
          {[...active, ...revoked].map((row) => (
            <div className="admin-card" key={row.id}>
              <div className="admin-city-top">
                <b>{nameOf(row.guideId)}</b>
                <span className={row.revokedAt === null ? 'tag' : 'admin-unset'}>
                  {scopeLabel(row.scope)}
                </span>
                {row.revokedAt !== null && (
                  <span className="admin-unset">Цуцалсан · {when(row.revokedAt)}</span>
                )}
              </div>

              <span className="admin-muted">
                {[
                  SOURCES.find((entry) => entry.value === row.source)?.label ?? row.source,
                  when(row.recordedAt),
                ].join(' · ')}
              </span>

              {/* The evidence, shown rather than stored out of sight: it is the answer to
                  "how do we know this guide agreed?", and it is only useful if it is read. */}
              <p className="admin-body">{row.evidenceNote}</p>

              {row.revokedAt === null && (
                <div className="admin-actions">
                  <button
                    className="btn btn-soft admin-danger"
                    type="button"
                    disabled={busy}
                    onClick={() => revoke(row)}
                  >
                    Цуцлах
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
