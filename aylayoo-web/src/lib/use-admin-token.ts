'use client';

import { useCallback, useEffect, useState } from 'react';

/* Where the admin token lives.
 *
 * sessionStorage, deliberately:
 *   - not localStorage, because that would leave an 8-hour token on the machine after the
 *     tab is closed, on whatever shared or borrowed computer it was used from;
 *   - not a cookie, because nothing needs it sent automatically and a cookie would ride
 *     along on every request to the API;
 *   - not memory alone, because a page reload during a review session would sign the admin
 *     out for no good reason.
 *
 * sessionStorage keeps it for one tab and drops it when that tab closes.
 */

const KEY = 'aylayoo-admin-token';

export function useAdminToken() {
  const [token, setToken] = useState<string | null>(null);
  /* Until the stored token has been read, neither the login form nor the dashboard should be
   * drawn — flashing the login screen at an already-signed-in admin looks like a logout. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(KEY));
    } catch {
      // Storage blocked: the session simply lives in memory for this page view.
    }
    setReady(true);
  }, []);

  const signIn = useCallback((next: string) => {
    setToken(next);
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      // Not being able to persist it is survivable; the tab keeps working.
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing stored, nothing to remove.
    }
  }, []);

  return { token, ready, signIn, signOut };
}
