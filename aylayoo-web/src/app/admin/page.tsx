'use client';

import { useState } from 'react';
import { getAimags } from '../../lib/api';
import { useAdminToken } from '../../lib/use-admin-token';
import { useResource } from '../../lib/use-resource';
import { LogoMark } from '../components/icons';
import { AdminLogin } from './AdminLogin';
import { ApprovedGuides } from './ApprovedGuides';
import { CityTab } from './city/CityTab';
import { Messages } from './Messages';
import { PendingGuides } from './PendingGuides';

/* The admin screen.
 *
 * Not linked from anywhere on the public site, and marked noindex in layout.tsx — it is
 * reached by typing /admin. That is not security on its own; the API is what enforces access,
 * and every call here carries a bearer token it rejects without.
 *
 * Deliberately one page in Mongolian only. It is used by the three people who run the site,
 * so a language switch would be furniture nobody needs.
 */

type Tab = 'pending' | 'approved' | 'city' | 'messages';

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Хүлээгдэж байгаа бүртгэл' },
  { key: 'approved', label: 'Баталгаажсан хөтчүүд' },
  { key: 'city', label: 'Хот' },
  { key: 'messages', label: 'Мессежүүд' },
];

export default function AdminPage() {
  const { token, ready, signIn, signOut } = useAdminToken();
  const [tab, setTab] = useState<Tab>('pending');
  /* The aimag list is public, so it needs no token — and it is fetched here rather than in the
   * editor so that opening several guides in turn does not refetch all 22 each time. */
  const aimags = useResource(getAimags);

  // Nothing is drawn until the stored token has been read, so an already-signed-in admin
  // never sees the login form flash past on a reload.
  if (!ready) return <main className="admin" />;

  if (!token) {
    return (
      <main className="admin">
        <AdminLogin onSignedIn={signIn} />
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <div className="wrap">
          <span className="admin-brand">
            <LogoMark />
            <b>АЯЛЪЯ ӨӨ</b> админ
          </span>
          <button className="btn btn-ghost" type="button" onClick={signOut}>
            Гарах
          </button>
        </div>
      </header>

      <div className="wrap admin-body-wrap">
        <div className="filters admin-tabs" role="tablist" aria-label="Хэсэг">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              aria-controls={`tab-${key}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Only the visible tab is mounted, so switching away cancels nothing important and
            coming back re-fetches — the point of this screen is to see current state. */}
        {tab === 'pending' && (
          <section id="tab-pending" role="tabpanel" aria-label="Хүлээгдэж байгаа бүртгэл">
            {/* An expired token cannot be retried, so a 401 signs out rather than erroring. */}
            <PendingGuides token={token} onUnauthorized={signOut} />
          </section>
        )}

        {tab === 'approved' && (
          <section id="tab-approved" role="tabpanel" aria-label="Баталгаажсан хөтчүүд">
            <ApprovedGuides
              token={token}
              aimags={aimags.data ?? []}
              onUnauthorized={signOut}
            />
          </section>
        )}

        {tab === 'city' && (
          <section id="tab-city" role="tabpanel" aria-label="Хот">
            {/* Everything the Ulaanbaatar section shows: itineraries, walking routes, places
                to eat, the practical guide, the phrasebook and what is on. */}
            <CityTab token={token} onUnauthorized={signOut} />
          </section>
        )}

        {tab === 'messages' && (
          <section id="tab-messages" role="tabpanel" aria-label="Мессежүүд">
            <Messages token={token} />
          </section>
        )}
      </div>
    </main>
  );
}
