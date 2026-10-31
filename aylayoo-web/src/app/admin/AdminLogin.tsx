'use client';

import { useState } from 'react';
import { ApiError } from '../../lib/api';
import { adminLogin } from '../../lib/admin-api';
import { LogoMark } from '../components/icons';

/* The sign-in card. Styled from the design's dialog pieces (.dlg, .fld, .btn) so the admin
 * screen looks like part of the same site. */
export function AdminLogin({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await adminLogin(
        String(form.get('email') ?? '').trim(),
        String(form.get('password') ?? ''),
      ));
    } catch (cause) {
      setBusy(false);
      /* Login is capped at 10 attempts an hour as brute-force protection, so the API's own
       * message has to come through — "wrong password" and "too many attempts" need to be
       * told apart by whoever is locked out. */
      setError(cause instanceof ApiError ? cause.message : 'Нэвтэрч чадсангүй');
    }
  }

  return (
    <div className="admin-login">
      <form className="dlg" onSubmit={onSubmit}>
        <div className="admin-login-mark">
          <LogoMark />
        </div>
        <h3>Админ нэвтрэх</h3>
        <p>АЯЛЪЯ ӨӨ-ийн хөтөч бүртгэл, мессежийг хянах хуудас.</p>

        <label className="fld">
          <span>Имэйл</span>
          <input required name="email" type="email" autoComplete="username" autoFocus />
        </label>
        <label className="fld">
          <span>Нэвтрэх үг</span>
          <input required name="password" type="password" autoComplete="current-password" />
        </label>

        {error && <p className="fld-error" role="alert">{error}</p>}

        <div className="dlg-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
          </button>
        </div>
      </form>
    </div>
  );
}
