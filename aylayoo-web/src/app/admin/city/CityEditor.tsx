'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '../../../lib/api';
import {
  createCityRow, deleteCityRow, getAdminCity, reorderCity, setCityStatus, updateCityRow,
  type AdminCityRow,
} from '../../../lib/admin-api';
import { useResource } from '../../../lib/use-resource';
import { CityForm, STATUS_LABEL } from './CityForm';
import type { CityResource } from './resources';

/* One city resource's list, and everything an admin can do to it.
 *
 * Follows ApprovedGuides: useResource for the list, local state while editing so Cancel really
 * cancels, a `busy` guard so a double click cannot send two writes, an inline error, and
 * reload() after a save rather than patching the row in place — the point of this screen is to
 * show what the database actually holds.
 */

export function CityEditor({
  resource, token, onUnauthorized,
}: { resource: CityResource; token: string; onUnauthorized: () => void }) {
  /* Keyed on the kind as well as the token, so switching sub-tab refetches rather than showing
   * the previous resource's rows under the new one's headings. */
  const fetcher = useCallback(() => getAdminCity(token, resource.kind), [token, resource.kind]);
  const rows = useResource(fetcher);

  /** The row being edited, 'new' while creating, or null. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* A 401 cannot be recovered from by retrying, so it signs the admin out instead of showing
   * an error — the same rule as every other screen here. */
  const handle = (cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      onUnauthorized();
      return;
    }
    setError(cause instanceof ApiError ? cause.message : 'Үйлдэл хийхэд алдаа гарлаа');
  };

  /** Runs one write, with the busy guard and the error handling every action here needs. */
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      rows.reload();
    } catch (cause) {
      handle(cause);
    } finally {
      setBusy(false);
    }
  }

  if (rows.loading) return <p className="admin-muted">Ачаалж байна…</p>;

  if (rows.error) {
    return (
      <div className="notice">
        <span>{rows.error}</span>
        <button type="button" onClick={rows.reload}>Дахин оролдох</button>
      </div>
    );
  }

  const list = rows.data ?? [];
  const drafts = list.filter((row) => row.status === 'draft').length;

  /* Reorder sends the whole list in its new order rather than the pair that moved — see
   * reorderCity. Moving the top row up or the bottom row down is a no-op, and those buttons
   * are disabled rather than silently doing nothing. */
  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= list.length) return;
    const ids = list.map((row) => row.id);
    [ids[index], ids[to]] = [ids[to], ids[index]];
    void run(() => reorderCity(token, resource.kind, ids));
  }

  return (
    <>
      <div className="admin-bar">
        <span className="found">
          {list.length} {resource.singular}
        </span>
        {/* The number worth acting on: these are the rows nobody can see yet. */}
        {drafts > 0 && <span className="admin-muted">{drafts} нооруулга</span>}
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setEditing('new')}
          disabled={editing === 'new'}
        >
          + Шинэ {resource.singular}
        </button>
        <button className="btn btn-soft admin-refresh" type="button" onClick={rows.reload}>
          Шинэчлэх
        </button>
      </div>

      {error && <p className="fld-error" role="alert">{error}</p>}

      {editing === 'new' && (
        <CityForm
          resource={resource}
          row={null}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (payload) => {
            await run(async () => {
              await createCityRow(token, resource.kind, payload);
              setEditing(null);
            });
          }}
        />
      )}

      {list.length === 0 ? (
        <div className="empty">{resource.label}: бичлэг байхгүй.</div>
      ) : (
        <div className="admin-rows">
          {list.map((row, index) => (
            <div className="admin-card admin-city-card" key={row.id}>
              <div className="admin-city-top">
                <b>{resource.titleOf(row) || `#${row.id}`}</b>
                <span
                  className={row.status === 'published' ? 'tag' : 'admin-unset'}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              </div>

              <Summary resource={resource} row={row} />

              <div className="admin-actions">
                <button
                  className="btn btn-soft"
                  type="button"
                  onClick={() => setEditing(editing === row.id ? null : row.id)}
                >
                  {editing === row.id ? 'Хаах' : 'Засах'}
                </button>

                <button
                  className="btn btn-soft"
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => setCityStatus(
                    token,
                    resource.kind,
                    row.id,
                    row.status === 'published' ? 'draft' : 'published',
                  ))}
                >
                  {row.status === 'published' ? 'Нийтлэхээ болих' : 'Нийтлэх'}
                </button>

                <button
                  className="btn btn-soft"
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`${resource.titleOf(row)} — дээш`}
                >
                  ↑
                </button>
                <button
                  className="btn btn-soft"
                  type="button"
                  disabled={busy || index === list.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`${resource.titleOf(row)} — доош`}
                >
                  ↓
                </button>

                <button
                  className="btn btn-soft admin-danger"
                  type="button"
                  disabled={busy}
                  /* A confirm() rather than an undo: a delete here is immediate and there is
                     nothing to restore it from. */
                  onClick={() => {
                    const name = resource.titleOf(row) || `#${row.id}`;
                    if (window.confirm(`"${name}" устгах уу? Үүнийг буцаах боломжгүй.`)) {
                      void run(() => deleteCityRow(token, resource.kind, row.id));
                    }
                  }}
                >
                  Устгах
                </button>
              </div>

              {editing === row.id && (
                <CityForm
                  resource={resource}
                  row={row}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={async (payload) => {
                    await run(async () => {
                      await updateCityRow(token, resource.kind, row.id, payload);
                      setEditing(null);
                    });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* A line or two about the row, so the list is scannable without opening each one.
 *
 * Fields with nothing in them are left out rather than printed as a dash — the same rule the
 * guide cards follow, and for the same reason: most city rows start out mostly empty, and a
 * card of blank labels tells you less than a short one. */
function Summary({ resource, row }: { resource: CityResource; row: AdminCityRow }) {
  const parts: string[] = [];

  if (resource.kind === 'itineraries') parts.push(`${row.days} өдөр`);
  if (resource.kind === 'phrases') {
    if (typeof row.pronunciation === 'string') parts.push(row.pronunciation);
    if (typeof row.meaningEn === 'string') parts.push(row.meaningEn);
  }
  if (resource.kind === 'events' && typeof row.startDate === 'string') {
    parts.push(row.endDate ? `${row.startDate} – ${row.endDate}` : row.startDate);
  }
  if (Array.isArray(row.stops)) parts.push(`${row.stops.length} зогсоол`);
  if (typeof row.topic === 'string') parts.push(row.topic);
  if (typeof row.category === 'string') parts.push(row.category);

  if (parts.length === 0) return null;
  return <span className="admin-muted">{parts.join(' · ')}</span>;
}
