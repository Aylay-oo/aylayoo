'use client';

import type { CityStop, TimeOfDay } from '../../../lib/api';
import { TIMES_OF_DAY, TIME_OF_DAY_MN } from '../../../lib/city-labels';

/* Editing an itinerary's or a route's stops, in order.
 *
 * The order is the content here, so moving a stop has to be as easy as typing in one. The whole
 * array is held in the form's state and saved with the row — the API stores it as one JSON
 * column, so there is no per-stop request and no half-saved route.
 *
 * Coordinates are optional and both-or-neither: the API refuses half of one, and this says so
 * before the request is sent. A stop with none still renders in the public list — it is only
 * left off the map — which is the right answer for a place whose location nobody has looked up
 * rather than inventing one.
 */

export const emptyStop = (): CityStop => ({
  placeMn: '',
  placeEn: '',
  timeOfDay: null,
  noteMn: null,
  noteEn: null,
  lat: null,
  lng: null,
});

/** Ulaanbaatar's own box, as the API enforces it. Stated here so the hint cannot drift. */
const UB_LAT = { min: 47.6, max: 48.1 };
const UB_LNG = { min: 106.5, max: 107.4 };

/**
 * What is wrong with these stops, in Mongolian, or null.
 *
 * Checked here as well as on the server so an admin who has just typed six stops is told which
 * one is wrong next to the field, rather than getting one error for the whole form back from
 * the API.
 */
export function stopsProblem(stops: readonly CityStop[]): string | null {
  for (const [i, stop] of stops.entries()) {
    const at = `${i + 1}-р зогсоол:`;
    if (!stop.placeMn.trim() || !stop.placeEn.trim()) {
      return `${at} нэрийг хоёр хэл дээр бичнэ үү.`;
    }
    if ((stop.lat === null) !== (stop.lng === null)) {
      return `${at} өргөрөг, уртраг хоёуланг бичнэ, эсвэл хоёуланг хоосон орхи.`;
    }
    if (stop.lat !== null && (stop.lat < UB_LAT.min || stop.lat > UB_LAT.max)) {
      return `${at} өргөрөг ${UB_LAT.min}–${UB_LAT.max} хооронд байх ёстой.`;
    }
    if (stop.lng !== null && (stop.lng < UB_LNG.min || stop.lng > UB_LNG.max)) {
      return `${at} уртраг ${UB_LNG.min}–${UB_LNG.max} хооронд байх ёстой.`;
    }
  }
  return null;
}

/** A coordinate box's text turned into a number, or null when it is empty or not one. */
const toCoord = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export function StopsEditor(
  { stops, onChange }: { stops: CityStop[]; onChange: (next: CityStop[]) => void },
) {
  const replace = (index: number, patch: Partial<CityStop>) => {
    onChange(stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)));
  };

  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= stops.length) return;
    const next = [...stops];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  return (
    <div className="admin-stops">
      {stops.length === 0 && (
        <p className="admin-muted">Зогсоол нэмээгүй байна.</p>
      )}

      {stops.map((stop, index) => (
        /* The index is the key on purpose: a stop has no id of its own, and a reorder is meant
           to move the row rather than tear it down and build a new one. */
        <fieldset className="admin-stop" key={index}>
          <legend>{index + 1}</legend>

          <div className="fld-row">
            <label className="fld">
              <span>Газрын нэр (MN)</span>
              <input
                value={stop.placeMn}
                onChange={(e) => replace(index, { placeMn: e.target.value })}
              />
            </label>
            <label className="fld">
              <span>Газрын нэр (EN)</span>
              <input
                value={stop.placeEn}
                onChange={(e) => replace(index, { placeEn: e.target.value })}
              />
            </label>
          </div>

          <div className="fld-row">
            <label className="fld">
              <span>Цаг</span>
              <select
                value={stop.timeOfDay ?? ''}
                onChange={(e) => replace(index, {
                  timeOfDay: (e.target.value || null) as TimeOfDay | null,
                })}
              >
                {/* Blank is the right answer for a walking route, which is walked in one go. */}
                <option value="">—</option>
                {TIMES_OF_DAY.map((time) => (
                  <option value={time} key={time}>{TIME_OF_DAY_MN[time]}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span>Өргөрөг (lat)</span>
              <input
                inputMode="decimal"
                placeholder="47.9212"
                defaultValue={stop.lat ?? ''}
                onBlur={(e) => replace(index, { lat: toCoord(e.target.value) })}
              />
            </label>
            <label className="fld">
              <span>Уртраг (lng)</span>
              <input
                inputMode="decimal"
                placeholder="106.8944"
                defaultValue={stop.lng ?? ''}
                onBlur={(e) => replace(index, { lng: toCoord(e.target.value) })}
              />
            </label>
          </div>

          <div className="fld-row">
            <label className="fld">
              <span>Тэмдэглэл (MN)</span>
              <input
                value={stop.noteMn ?? ''}
                onChange={(e) => replace(index, { noteMn: e.target.value || null })}
              />
            </label>
            <label className="fld">
              <span>Тэмдэглэл (EN)</span>
              <input
                value={stop.noteEn ?? ''}
                onChange={(e) => replace(index, { noteEn: e.target.value || null })}
              />
            </label>
          </div>

          <div className="admin-stop-actions">
            <button
              className="btn btn-soft"
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`${index + 1}-р зогсоолыг дээш`}
            >
              ↑
            </button>
            <button
              className="btn btn-soft"
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === stops.length - 1}
              aria-label={`${index + 1}-р зогсоолыг доош`}
            >
              ↓
            </button>
            <button
              className="btn btn-soft admin-danger"
              type="button"
              onClick={() => onChange(stops.filter((_, i) => i !== index))}
              aria-label={`${index + 1}-р зогсоолыг хасах`}
            >
              Хасах
            </button>
          </div>
        </fieldset>
      ))}

      <button
        className="btn btn-soft"
        type="button"
        onClick={() => onChange([...stops, emptyStop()])}
      >
        + Зогсоол нэмэх
      </button>
    </div>
  );
}
