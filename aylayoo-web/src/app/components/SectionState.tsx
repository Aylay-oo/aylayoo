'use client';

import { useLang } from '../../lib/i18n';

/* The loading and error furniture every API-backed section uses.
 *
 * The rule across the page: a section that cannot load its data says so quietly and offers
 * a retry, while everything around it keeps working. Nothing here ever replaces the whole
 * page, and no section's failure hides the static content next to it.
 */

/** A quiet inline failure with a retry, for when a section's data did not arrive. */
export function Notice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLang();
  return (
    <div className="notice" role="status">
      <span>{t(message)}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {t('Дахин оролдох')}
        </button>
      )}
    </div>
  );
}

/** Announces to a screen reader that a section has finished loading. */
export function LoadingLive({ loading, label }: { loading: boolean; label: string }) {
  const { t } = useLang();
  return (
    <span className="sr-live" role="status" aria-live="polite">
      {loading ? t('Ачаалж байна…') : t(label)}
    </span>
  );
}

/** Placeholder guide cards, sized like the real ones so the layout does not jump. */
export function GuideCardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div className="sk-card" key={i} aria-hidden="true">
          <div className="sk sk-av" />
          <div className="sk sk-line" />
          <div className="sk sk-line mid" />
          <div className="sk sk-line short" />
        </div>
      ))}
    </>
  );
}

/** Placeholder rows for the info card's list of places. */
export function PlaceRowSkeletons({ count = 3 }: { count?: number }) {
  return (
    <ul className="places" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <span className="sk sk-thumb" />
          <div style={{ width: '100%' }}>
            <div className="sk sk-line" />
            <div className="sk sk-line mid" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Placeholder cards for the city section's lists, sized like the real ones. */
export function CityCardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="city-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="sk-card" key={i}>
          <div className="sk sk-line" />
          <div className="sk sk-line mid" />
          <div className="sk sk-line short" />
        </div>
      ))}
    </div>
  );
}
