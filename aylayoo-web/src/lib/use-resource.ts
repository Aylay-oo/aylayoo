'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from './api';

export type Resource<T> = {
  data: T | null;
  loading: boolean;
  /** A message already fit to show a visitor, or null. */
  error: string | null;
  reload: () => void;
};

/**
 * Loads one section's data.
 *
 * Deliberately small: each section owns its own request so a slow or failed endpoint only
 * affects that section, and the rest of the page — including everything static — renders
 * as normal. `fetcher` must be stable (module-level function or useCallback), because it
 * is the effect's dependency.
 */
export function useResource<T>(fetcher: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetcher().then(
      (result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      },
      (cause: unknown) => {
        if (!active) return;
        setError(cause instanceof ApiError ? cause.message : 'Мэдээлэл ачаалахад алдаа гарлаа');
        setLoading(false);
      },
    );

    // A language switch or a retry can re-run this while a request is in flight; ignoring
    // the stale response keeps an older, slower answer from overwriting a newer one.
    return () => {
      active = false;
    };
  }, [fetcher, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, loading, error, reload };
}
