'use client';

import { useState } from 'react';
import { ApiError } from '../../../lib/api';
import { deleteTripRequest, erasureLookup } from '../../../lib/admin-api';

/* "Delete my data" — the admin half of it.
 *
 * Not self-service, because the only thing proving a request belongs to the person asking is
 * the contact detail they want deleted. So they give the reference AND the contact they used,
 * an admin runs this, and both halves must match.
 *
 * What the endpoint behind this deliberately will not do, and why the screen looks thin:
 *
 *   - it never says which half was wrong, so it cannot be used to check whether a given phone
 *     number is in the database;
 *   - it never returns the stored contact, only whether what was typed matches;
 *   - it does not delete. The match comes back, and deleting is a second, deliberate press.
 *
 * It is admin-only, so it is not a public oracle — but it is one an admin could be talked into
 * operating by somebody on the phone, which is the reason it answers as little as it does.
 */

type Found = { id: number; status: string } | null;

export function ErasureLookup({ token, onUnauthorized, onDeleted }: {
  token: string;
  onUnauthorized: () => void;
  onDeleted: () => void;
}) {
  const [reference, setReference] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [found, setFound] = useState<Found>(null);

  const handle = (cause: unknown) => {
    if (cause instanceof ApiError && cause.status === 401) {
      onUnauthorized();
      return;
    }
    setError(cause instanceof ApiError ? cause.message : 'Үйлдэл хийхэд алдаа гарлаа');
  };

  async function look(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setFound(null);

    try {
      const result = await erasureLookup(token, reference.trim(), contact.trim());
      if (result.matched && result.id) {
        setFound({ id: result.id, status: result.status ?? '' });
        setAnswer('Таарлаа. Доорх товчоор устгана.');
      } else if (result.contactAlreadyCleared) {
        /* The retention pass has already cleared the contact, so there is nothing left to
         * compare against — and saying so is more honest than "no match". */
        setAnswer('Холбоо барих хаяг хадгалах хугацаа дууссанаар аль хэдийн устсан байна.');
      } else {
        setAnswer('Таарсангүй. Дугаар болон холбоо барих хаяг хоёулаа тохирох ёстой.');
      }
    } catch (cause) {
      handle(cause);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!found || busy) return;
    if (!window.confirm('Энэ хүсэлтийг бүрмөсөн устгах уу?')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTripRequest(token, found.id);
      setFound(null);
      setReference('');
      setContact('');
      setAnswer('Устгалаа.');
      onDeleted();
    } catch (cause) {
      handle(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form admin-erasure" onSubmit={look}>
      <h3>Мэдээлэл устгах хүсэлт</h3>
      <p className="admin-muted">
        Аялагч өөрийн хүсэлтийн дугаар болон бүртгүүлсэн холбоо барих хаягаа хэлнэ. Хоёулаа
        тохирвол устгаж болно.
      </p>

      <label className="fld">
        <span>Хүсэлтийн дугаар</span>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="R7K2-9QMX-4TBV"
          required
        />
      </label>

      <label className="fld">
        <span>Холбоо барих хаяг</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Утас эсвэл имэйл"
          required
        />
      </label>

      {error && <p className="fld-error" role="alert">{error}</p>}
      {answer && <p className="admin-ok" role="status">{answer}</p>}

      <div className="admin-actions">
        <button className="btn btn-soft" type="submit" disabled={busy}>
          {busy ? 'Шалгаж байна…' : 'Шалгах'}
        </button>
        {found && (
          <button
            className="btn btn-soft admin-danger"
            type="button"
            disabled={busy}
            onClick={remove}
          >
            Устгах
          </button>
        )}
      </div>
    </form>
  );
}
