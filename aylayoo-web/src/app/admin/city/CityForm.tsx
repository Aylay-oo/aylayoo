'use client';

import { useState } from 'react';
import type { CityStop } from '../../../lib/api';
import { ApiError, type CityStatus } from '../../../lib/api';
import type { AdminCityRow } from '../../../lib/admin-api';
import { StopsEditor, emptyStop, stopsProblem } from './StopsEditor';
import type { CityResource, Field } from './resources';

/* The create/edit form for any city resource, rendered from its field list.
 *
 * Values are held as strings while being typed, whatever the column's type, and converted once
 * on save. That is what lets a number box be genuinely empty: a `priceLevel` the team has not
 * checked must stay NULL rather than becoming 0, and a controlled number input cannot hold
 * "nothing" without this.
 *
 * Only changed fields are sent on an edit. The API leaves an absent field alone, so this is not
 * an optimisation — it is what keeps two admins editing different fields of the same row from
 * overwriting each other, and what the service's validators.ts comment is about.
 */

type Values = Record<string, string>;

/** The stored row turned into form strings. Null and undefined both become "". */
function toValues(resource: CityResource, row: AdminCityRow | null): Values {
  const values: Values = {};
  for (const field of resource.fields) {
    if (field.type === 'stops') continue;
    const current = row?.[field.key];
    values[field.key] = current === null || current === undefined ? '' : String(current);
  }
  return values;
}

function toStops(row: AdminCityRow | null): CityStop[] {
  const stops = row?.stops;
  return Array.isArray(stops) ? (stops as CityStop[]).map((stop) => ({ ...stop })) : [];
}

export function CityForm({
  resource, row, busy, onCancel, onSave,
}: {
  resource: CityResource;
  /** The row being edited, or null to create a new one. */
  row: AdminCityRow | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Values>(() => toValues(resource, row));
  const [stops, setStops] = useState<CityStop[]>(() => toStops(row));
  const [error, setError] = useState<string | null>(null);

  const hasStops = resource.fields.some((field) => field.type === 'stops');
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  /** The payload, with each field converted to what its column wants. */
  function build(): Record<string, unknown> | null {
    const payload: Record<string, unknown> = {};

    for (const field of resource.fields) {
      if (field.type === 'stops') continue;
      const raw = (values[field.key] ?? '').trim();

      if (field.required && raw === '') {
        setError(`"${field.label}" хоосон байж болохгүй.`);
        return null;
      }

      /* An empty optional field means NULL, and has to be sent as one to clear a value that
       * was there before. Leaving it out would silently keep the old value. */
      if (raw === '') {
        if (!field.required && row) payload[field.key] = null;
        continue;
      }

      if (field.type === 'number' || (field.type === 'select' && typeof field.options?.[0]?.value === 'number')) {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          setError(`"${field.label}" тоо байх ёстой.`);
          return null;
        }
        payload[field.key] = parsed;
      } else {
        payload[field.key] = raw;
      }
    }

    if (hasStops) {
      const problem = stopsProblem(stops);
      if (problem) {
        setError(problem);
        return null;
      }
      payload.stops = stops;
    }

    return payload;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    const payload = build();
    if (!payload) return;

    try {
      await onSave(payload);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Хадгалахад алдаа гарлаа');
    }
  }

  return (
    <form className="admin-edit admin-city-form" onSubmit={submit}>
      {resource.fields.map((field) => (
        field.type === 'stops' ? (
          <div className="fld" key={field.key}>
            <span>{field.label}</span>
            <StopsEditor stops={stops} onChange={setStops} />
          </div>
        ) : (
          <FieldInput
            field={field}
            value={values[field.key] ?? ''}
            onChange={(value) => set(field.key, value)}
            key={field.key}
          />
        )
      ))}

      {/* role="alert" so a validation message is announced rather than only appearing. */}
      {error && <p className="fld-error" role="alert">{error}</p>}

      <div className="admin-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Хадгалж байна…' : 'Хадгалах'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={busy}>
          Болих
        </button>
        {!row && (
          <span className="admin-muted">Шинэ бичлэг нооруулга (draft) болж хадгалагдана.</span>
        )}
      </div>
    </form>
  );
}

function FieldInput({
  field, value, onChange,
}: { field: Field; value: string; onChange: (value: string) => void }) {
  const hintId = field.hint ? `hint-${field.key}` : undefined;

  return (
    <label className="fld">
      <span>
        {field.label}
        {field.required && <b aria-hidden="true"> *</b>}
      </span>

      {field.type === 'textarea' && (
        <textarea
          value={value}
          rows={field.rows ?? 3}
          aria-describedby={hintId}
          aria-required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === 'select' && (
        <select
          value={value}
          aria-describedby={hintId}
          aria-required={field.required}
          onChange={(e) => onChange(e.target.value)}
        >
          {/* Kept even when the field is required, so "nothing chosen yet" is a state the form
              can be in and the admin has to make the choice deliberately. */}
          <option value="">—</option>
          {field.options?.map((option) => (
            <option value={String(option.value)} key={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
        <input
          type={field.type === 'date' ? 'date' : 'text'}
          inputMode={field.type === 'number' ? 'numeric' : undefined}
          value={value}
          aria-describedby={hintId}
          aria-required={field.required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.hint && <span className="fld-hint" id={hintId}>{field.hint}</span>}
    </label>
  );
}

/** The two words this screen uses for a status, so the list and the buttons agree. */
export const STATUS_LABEL: Record<CityStatus, string> = {
  draft: 'Нооруулга',
  published: 'Нийтэлсэн',
};

export { emptyStop };
