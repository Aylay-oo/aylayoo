'use client';

import { useState } from 'react';
import type { CityStop } from '../../../lib/api';
import type { AdminGuide, AdminTour } from '../../../lib/admin-api';
import { StopsEditor, emptyStop, stopsProblem } from '../city/StopsEditor';

/* Create or edit one tour.
 *
 * Hand-written rather than generated from a field list the way the six city resources are,
 * because of one field: `guideId`. It is a select whose options come from the approved-guide
 * list, and it is the field that decides whether the tour can ever be published — the
 * consent check keys on it. Threading a "select whose options are fetched" through
 * resources.ts would complicate every other resource to serve this one.
 *
 * Like CityForm, values are held as strings while typing and converted once on save, so a
 * duration the team has not decided stays NULL instead of becoming 0 — and only changed fields
 * are sent on an edit, which is what keeps a PUT from clearing a column somebody else just set.
 */

type Values = {
  titleMn: string; titleEn: string;
  summaryMn: string; summaryEn: string;
  guideId: string;
  durationMinutes: string;
  meetingPointMn: string; meetingPointEn: string;
};

const asString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

const toValues = (tour: AdminTour | null): Values => ({
  titleMn: asString(tour?.titleMn),
  titleEn: asString(tour?.titleEn),
  summaryMn: asString(tour?.summaryMn),
  summaryEn: asString(tour?.summaryEn),
  guideId: asString(tour?.guideId),
  durationMinutes: asString(tour?.durationMinutes),
  meetingPointMn: asString(tour?.meetingPointMn),
  meetingPointEn: asString(tour?.meetingPointEn),
});

export function TourForm({ tour, guides, busy, onCancel, onSave }: {
  tour: AdminTour | null;
  guides: readonly AdminGuide[];
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Values>(() => toValues(tour));
  const [stops, setStops] = useState<CityStop[]>(
    () => (Array.isArray(tour?.stops) ? tour.stops.map((stop) => ({ ...stop })) : []),
  );
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  function build(): Record<string, unknown> | null {
    const titleMn = values.titleMn.trim();
    const titleEn = values.titleEn.trim();
    if (!titleMn) {
      setError('"Нэр (MN)" хоосон байж болохгүй.');
      return null;
    }
    if (!titleEn) {
      setError('"Нэр (EN)" хоосон байж болохгүй.');
      return null;
    }
    if (!values.guideId) {
      setError('Хөтөч сонгоно уу.');
      return null;
    }

    const problem = stopsProblem(stops);
    if (problem) {
      setError(problem);
      return null;
    }

    const duration = values.durationMinutes.trim();
    if (duration && !/^\d+$/.test(duration)) {
      setError('Хугацааг минутаар, бүхэл тоогоор бичнэ үү.');
      return null;
    }

    const next: Record<string, unknown> = {
      titleMn,
      titleEn,
      guideId: Number(values.guideId),
      summaryMn: values.summaryMn.trim() || null,
      summaryEn: values.summaryEn.trim() || null,
      durationMinutes: duration ? Number(duration) : null,
      meetingPointMn: values.meetingPointMn.trim() || null,
      meetingPointEn: values.meetingPointEn.trim() || null,
      stops,
    };

    /* On an edit, send only what changed. `status` is deliberately never sent from this form:
     * publishing is its own button, so a save cannot smuggle a tour past the consent check. */
    if (!tour) return next;

    const changed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      const before = key === 'stops'
        ? JSON.stringify(tour.stops ?? [])
        : JSON.stringify((tour as unknown as Record<string, unknown>)[key] ?? null);
      if (JSON.stringify(key === 'stops' ? value : value ?? null) !== before) {
        changed[key] = value;
      }
    }
    if (Object.keys(changed).length === 0) {
      setError('Юу ч өөрчлөгдөөгүй байна.');
      return null;
    }
    return changed;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const payload = build();
    if (payload) await onSave(payload);
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label className="fld">
        <span>Нэр (MN)</span>
        <input value={values.titleMn} onChange={(e) => set('titleMn', e.target.value)} required />
      </label>
      <label className="fld">
        <span>Нэр (EN)</span>
        <input value={values.titleEn} onChange={(e) => set('titleEn', e.target.value)} required />
      </label>

      <label className="fld">
        <span>Хөтөч</span>
        <select value={values.guideId} onChange={(e) => set('guideId', e.target.value)} required>
          <option value="">— сонгох —</option>
          {guides.map((guide) => (
            <option key={guide.id} value={guide.id}>
              {guide.name} (#{guide.id})
            </option>
          ))}
        </select>
        {/* Said here because the picker is where the consequence is chosen. */}
        <small className="fld-hint">
          Зөвхөн баталгаажсан хөтчүүд. Нийтлэхийн тулд хөтөч зөвшөөрөл өгсөн байх шаардлагатай.
        </small>
      </label>

      <label className="fld">
        <span>Тайлбар (MN)</span>
        <textarea
          rows={3}
          value={values.summaryMn}
          onChange={(e) => set('summaryMn', e.target.value)}
        />
      </label>
      <label className="fld">
        <span>Тайлбар (EN)</span>
        <textarea
          rows={3}
          value={values.summaryEn}
          onChange={(e) => set('summaryEn', e.target.value)}
        />
      </label>

      <label className="fld">
        <span>Хугацаа (минут)</span>
        <input
          type="number"
          min={15}
          max={1440}
          value={values.durationMinutes}
          onChange={(e) => set('durationMinutes', e.target.value)}
        />
        <small className="fld-hint">Мэдэхгүй бол хоосон орхи.</small>
      </label>

      <label className="fld">
        <span>Уулзах газар (MN)</span>
        <input
          value={values.meetingPointMn}
          onChange={(e) => set('meetingPointMn', e.target.value)}
        />
      </label>
      <label className="fld">
        <span>Уулзах газар (EN)</span>
        <input
          value={values.meetingPointEn}
          onChange={(e) => set('meetingPointEn', e.target.value)}
        />
      </label>

      <fieldset className="admin-fieldset">
        <legend>Зогсоолууд</legend>
        <StopsEditor stops={stops} onChange={setStops} />
        <button
          className="btn btn-soft"
          type="button"
          onClick={() => setStops([...stops, emptyStop()])}
        >
          + Зогсоол
        </button>
      </fieldset>

      {error && <p className="fld-error" role="alert">{error}</p>}

      <div className="admin-actions">
        <button className="btn btn-plain" type="button" onClick={onCancel} disabled={busy}>
          Болих
        </button>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Хадгалж байна…' : 'Хадгалах'}
        </button>
      </div>
    </form>
  );
}
