'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, sendContact } from '../../lib/api';
import { useDialogs } from '../../lib/dialogs';
import { useLang } from '../../lib/i18n';
import { BigCheckIcon } from './icons';

/* One dialog for both "get in touch with this guide" and "book this trip".
 *
 * The design opened it from a guide's card or a trip's card and read the subject out of the
 * button's data attribute; here it comes from the dialogs context. The two modes differ only
 * in their title, blurb and submit label — and in the `kind` sent to the API, which is what
 * lets the admin inbox tell a booking from a question.
 *
 * The contact field is one input that takes "a phone number or an email", exactly as the
 * design had it. Which of the two it is gets decided here rather than asked: anything with an
 * "@" is an email. The API accepts either and requires at least one.
 */

type Phase = 'form' | 'sending' | 'done';

export function ContactDialog() {
  const { t } = useLang();
  const { contact, closeContact, showToast } = useDialogs();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const booking = contact?.kind === 'booking';

  /* <dialog> has to be opened through showModal() to get the backdrop, the top layer and the
   * focus trap — setting an `open` attribute gives a non-modal dialog instead. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (contact && !dialog.open) {
      setPhase('form');
      setFieldError(null);
      dialog.showModal();
    } else if (!contact && dialog.open) {
      dialog.close();
    }
  }, [contact]);

  if (!contact) {
    // Still rendered, so the ref exists and the element keeps its place in the DOM.
    return <dialog ref={dialogRef} aria-label={t('Холбогдох')} />;
  }

  // Captured after the guard: TypeScript cannot carry the narrowing into the handler's
  // closure, and reading `contact` again there would be a nullable field.
  const request = contact;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'sending') return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const reach = String(form.get('contact') ?? '').trim();
    const message = String(form.get('msg') ?? '').trim();

    // An email needs an "@" and something on both sides of it; anything else is a phone.
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach);
    const hasAt = reach.includes('@');
    if (hasAt && !looksLikeEmail) {
      setFieldError('Утас эсвэл имэйлээ бүтэн бичнэ үү');
      return;
    }
    if (!hasAt && reach.replace(/[^\d]/g, '').length < 6) {
      setFieldError('Утас эсвэл имэйлээ бүтэн бичнэ үү');
      return;
    }
    /* The API wants at least five characters of message. The design left this optional, but
     * an empty request is not much use to a guide either, so it is required here and said so
     * rather than silently padded. */
    if (message.length < 5) {
      setFieldError('Аяллын талаар хэдэн үг бичнэ үү');
      return;
    }

    setFieldError(null);
    setPhase('sending');
    try {
      await sendContact({
        name,
        email: looksLikeEmail ? reach : undefined,
        phone: looksLikeEmail ? undefined : reach,
        message,
        guideId: request.guideId,
        subject: request.subject,
        kind: request.kind,
      });
      setPhase('done');
    } catch (cause) {
      setPhase('form');
      // A failure keeps everything typed, and says so in a toast rather than wiping the form.
      showToast(cause instanceof ApiError ? cause.message : t('Хүсэлт илгээхэд алдаа гарлаа'));
    }
  }

  return (
    <dialog ref={dialogRef} onClose={closeContact}>
      <form className="dlg" onSubmit={onSubmit}>
        {phase !== 'done' ? (
          <div>
            <h3>
              {t(booking ? `${contact.subject} — захиалга` : `${contact.subject}-тай холбогдох`)}
            </h3>
            <p>
              {t(booking
                ? 'Аяллын өдөр, хүний тоогоо үлдээгээрэй. Бид тохирох хөтөчтэй холбож өгнө.'
                : 'Мэдээллээ үлдээвэл тантай эргэж холбогдоно.')}
            </p>

            <label className="fld">
              <span>{t('Нэр')}</span>
              <input required name="name" autoComplete="name" />
            </label>
            <label className="fld">
              <span>{t('Утас эсвэл имэйл')}</span>
              <input required name="contact" autoComplete="email" />
            </label>
            <label className="fld">
              <span>{t('Аяллын тухай')}</span>
              <textarea
                required
                name="msg"
                minLength={5}
                placeholder={t('Хэзээ, хэдэн хүн, ямар газар очих вэ?')}
              />
            </label>

            {fieldError && <p className="fld-error">{t(fieldError)}</p>}

            <div className="dlg-actions">
              <button
                type="button"
                className="btn btn-plain"
                onClick={closeContact}
                disabled={phase === 'sending'}
              >
                {t('Болих')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={phase === 'sending'}>
                {phase === 'sending'
                  ? t('Илгээж байна…')
                  : t(booking ? 'Захиалах' : 'Хүсэлт илгээх')}
              </button>
            </div>
          </div>
        ) : (
          <div className="done show">
            <div className="city-ic">
              <BigCheckIcon />
            </div>
            <h3>{t('Хүсэлт илгээгдлээ')}</h3>
            <p style={{ color: 'var(--muted)', margin: '8px 0 18px' }}>
              {t('24 цагийн дотор тантай холбогдоно.')}
            </p>
            <button type="button" className="btn btn-primary" onClick={closeContact}>
              {t('Хаах')}
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}
