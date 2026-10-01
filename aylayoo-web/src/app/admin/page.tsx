'use client';

import { useState } from 'react';
import { useAdminToken } from '../../lib/use-admin-token';
import { LogoMark } from '../components/icons';
import { AdminLogin } from './AdminLogin';
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

type Tab = 'pending' | 'messages';

export default function AdminPage() {
  const { token, ready, signIn, signOut } = useAdminToken();
  const [tab, setTab] = useState<Tab>('pending');

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
            <b>АЯЛАЯ ӨӨ</b> админ
          </span>
          <button className="btn btn-ghost" type="button" onClick={signOut}>
            Гарах
          </button>
        </div>
      </header>

      <div className="wrap admin-body-wrap">
        <div className="filters admin-tabs" role="tablist" aria-label="Хэсэг">
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'pending'}
            aria-controls="tab-pending"
            onClick={() => setTab('pending')}
          >
            Хүлээгдэж байгаа бүртгэл
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'messages'}
            aria-controls="tab-messages"
            onClick={() => setTab('messages')}
          >
            Мессежүүд
          </button>
        </div>

        {/* Only the visible tab is mounted, so switching away cancels nothing important and
            coming back re-fetches — the point of this screen is to see current state. */}
        {tab === 'pending' ? (
          <section id="tab-pending" role="tabpanel" aria-label="Хүлээгдэж байгаа бүртгэл">
            {/* An expired token cannot be retried, so a 401 signs out rather than erroring. */}
            <PendingGuides token={token} onUnauthorized={signOut} />
          </section>
        ) : (
          <section id="tab-messages" role="tabpanel" aria-label="Мессежүүд">
            <Messages token={token} />
          </section>
        )}
      </div>
    </main>
  );
}
