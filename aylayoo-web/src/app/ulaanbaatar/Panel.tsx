'use client';

import type { ReactNode } from 'react';
import type { Resource } from '../../lib/use-resource';
import { CityCardSkeletons, LoadingLive, Notice } from '../components/SectionState';

/* The loading and error shell every tab on /ulaanbaatar shares.
 *
 * Each tab fetches its own data, which is the rule across this site: one slow or failed
 * endpoint empties its own panel and nothing else. So this is where "loading", "that did not
 * load, here is a retry" and "here is the data" live once, instead of six times.
 *
 * The empty state is deliberately NOT here. Each tab writes its own sentence with an inline
 * t('…') literal, because i18n-coverage.spec.ts scans the sources for exactly that shape — a
 * string threaded through a prop would be invisible to it, and an untranslated empty state is
 * the easiest kind to ship by accident. Food and events are empty by design until the team
 * adds rows, so those two sentences are the ones a visitor is most likely to read.
 *
 * `<LoadingLive>` renders unconditionally rather than inside a branch: a live region that is
 * added to the DOM at the same moment its text changes is not reliably announced.
 */
export function Panel<T>(
  { resource, label, empty, children }: {
    resource: Resource<T[]>;
    /** What to announce when this panel has finished loading. */
    label: string;
    /** The tab's own empty state, rendered when the list came back with nothing. */
    empty: ReactNode;
    children: (rows: T[]) => ReactNode;
  },
) {
  const rows = resource.data ?? [];

  return (
    <>
      <LoadingLive loading={resource.loading} label={label} />
      {(() => {
        if (resource.error) {
          return <Notice message={resource.error} onRetry={resource.reload} />;
        }
        if (resource.loading) return <CityCardSkeletons />;
        return rows.length === 0 ? empty : children(rows);
      })()}
    </>
  );
}
