'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError, sendTripRequest } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { formatReference, looksLikeContact } from '../../lib/trip-request';
import { BigCheckIcon } from './icons';
import { PrivacyNotice } from './PrivacyNotice';

/* "Ask about this tour" — the one form on the public site that collects a traveller's contact
 * details, and the first place aylayoo stores personal data about anyone but a guide.
 *
 * Four things here are not decoration:
 *
 *   1. The privacy notice is ON the form, above the button, in both languages. A traveller is
 *      handing over a phone number to be passed to a stranger; the four things they would want
 *      to know fit next to the submit button, so there is no good reason to make them go and
 *      find a policy page.
 *
 *   2. Contact details in the message are refused, with the warning on blur rather than on
 *      submit. The message is the field that bypasses staging — admin-trips.ts withholds the
 *      contact until the guide accepts, and a phone number typed into the free text would be
 *      handed over immediately. Refused, not quietly stripped: silently editing somebody's
 *      message is worse than telling them.
 *
 *   3. The confirmation says the TEAM will be in touch, not the guide. In R1a there is no
 *      email and guides have no portal — an admin relays by hand. A confirmation that implies
 *      the guide has the request would be a promise the system cannot keep.
 *
 *   4. The reference is shown, large, with the notice repeated beneath it naming it. It is the
 *      only handle the traveller will ever have on this request: erasure is keyed on it, and
 *      the server cannot look a request up without it.
 *
 * Self-contained rather than driven by the dialogs context, because it opens from a tour's own
 * page, which has no DialogsProvider — see DetailChrome for why detail pages do not carry the
 * home page's furniture.
 */

type Phase = 'form' | 'sending' | 'done';

const MESSAGE_MIN = 20;

export function TripRequestDialog({ open, onClose, tourId, tourTitle, guideId }: {
  open: boolean;
  onClose: () => void;
  /** Either a tour or a guide; the API requires exactly one of the two. */
  tourId?: number;
  tourTitle?: string;
  guideId?: number;
}) {
  const { t } = useLang();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  /** Shown while typing, before any submit — see note 2 above. */
  const [contactWarning, setContactWarning] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  /* showModal() rather than the `open` attribute: that is what gives the backdrop, the top
   * layer and the focus trap. Setting `open` renders a non-modal dialog instead. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setPhase('form');
      setError(null);
      setContactWarning(false);
      setReference(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'sending') return;

    const form = new FormData(event.currentTarget);
    const travellerName = String(form.get('name') ?? '').trim();
    const reach = String(form.get('contact') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();
    const partySize = String(form.get('partySize') ?? '').trim();
    const preferredFrom = String(form.get('preferredFrom') ?? '').trim();
    const preferredTo = String(form.get('preferredTo') ?? '').trim();
    const honeypot = String(form.get('website') ?? '').trim();

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reach);
    if (!looksLikeEmail && reach.replace(/\D/g, '').length < 6) {
      setError('Утас эсвэл имэйлээ бүтэн бичнэ үү');
      return;
    }
    if (message.length < MESSAGE_MIN) {
      setError('Аяллын талаар бүтэн өгүүлбэр бичнэ үү');
      return;
    }
    /* The same refusal the API makes, made here so the traveller can fix it without losing
     * what they typed. */
    if (looksLikeContact(message)) {
      setContactWarning(true);
      setError('Тайлбар дээрээ утас, имэйл бичих шаардлагагүй');
      return;
    }

    setError(null);
    setPhase('sending');
    try {
      const result = await sendTripRequest({
        travellerName,
        email: looksLikeEmail ? reach : undefined,
        phone: looksLikeEmail ? undefined : reach,
        message,
        partySize: partySize ? Number(partySize) : null,
        preferredFrom: preferredFrom || null,
        preferredTo: preferredTo || null,
        tourId: tourId ?? null,
        guideId: tourId ? null : guideId ?? null,
        website: honeypot,
      });
      setReference(result.data.reference);
      setPhase('done');
    } catch (cause) {
      setPhase('form');
      // Everything typed stays on screen; the API's own message is the most useful thing to
      // show, because it is the one that says *which* rule was broken.
      setError(cause instanceof ApiError
        ? cause.message
        : 'Хүсэлт илгээхэд алдаа гарлаа');
    }
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} aria-label={t('Аяллын хүсэлт')}>
      {/* dlg-wide/dlg-scroll: this is the longest form on the site, and on a phone it has to
          scroll inside the dialog rather than push its own buttons off the screen. */}
      {phase !== 'done' ? (
        <form className="dlg dlg-wide dlg-scroll" onSubmit={onSubmit}>
          <h3>{t('Аяллын хүсэлт')}</h3>
          <p>
            {tourTitle
              ? `${tourTitle} — ${t('хүсэлт')}`
              : t('Хүсэлтээ үлдээвэл манай баг хөтөчтэй холбож, тантай эргэж холбогдоно.')}
          </p>

          <label className="fld">
            <span>{t('Нэр')}</span>
            <input required name="name" autoComplete="name" maxLength={80} />
          </label>

          <label className="fld">
            <span>{t('Утас эсвэл имэйл')}</span>
            <input required name="contact" autoComplete="email" maxLength={120} />
          </label>

          <label className="fld">
            <span>{t('Аяллын тухай')}</span>
            <textarea
              required
              name="message"
              minLength={MESSAGE_MIN}
              maxLength={2000}
              placeholder={t('Хэзээ, хэдэн хүн, юу үзэхийг хүсэж байна?')}
              onBlur={(event) => setContactWarning(looksLikeContact(event.target.value))}
            />
          </label>

          {/* The warning, not a silent correction. It is phrased as what happens next, because
              "we will ask for this later" is the reason the field refuses it. */}
          {contactWarning && (
            <p className="fld-hint" role="status">
              {t('Утас, имэйлээ тайлбар дээр бичих шаардлагагүй — дээрх хүснэгтэд бичсэн нь хангалттай.')}
            </p>
          )}

          <div className="fld-row">
            <label className="fld">
              <span>{t('Хүний тоо')}</span>
              <input name="partySize" type="number" min={1} max={50} inputMode="numeric" />
            </label>
            <label className="fld">
              <span>{t('Хэзээнээс')}</span>
              <input name="preferredFrom" type="date" />
            </label>
            <label className="fld">
              <span>{t('Хэзээ хүртэл')}</span>
              <input name="preferredTo" type="date" />
            </label>
          </div>

          {/* The honeypot. Hidden from sight and from assistive technology, never autofilled,
              and the API refuses any request that arrives with it filled in. A real traveller
              never sees it; a form-filling script fills everything it finds. */}
          <div className="sr" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <PrivacyNotice kind="tripRequest" />

          {error && <p className="fld-error" role="alert">{t(error)}</p>}

          <div className="dlg-actions">
            <button
              type="button"
              className="btn btn-plain"
              onClick={onClose}
              disabled={phase === 'sending'}
            >
              {t('Болих')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={phase === 'sending'}>
              {phase === 'sending' ? t('Илгээж байна…') : t('Хүсэлт илгээх')}
            </button>
          </div>
        </form>
      ) : (
        <div className="dlg dlg-wide dlg-scroll done show">
          <div className="city-ic">
            <BigCheckIcon />
          </div>
          <h3>{t('Хүсэлт илгээгдлээ')}</h3>

          {/* The team, not the guide. In R1a an admin relays this by hand. */}
          <p>{t('Манай баг хөтөчтэй холбож, тантай эргэж холбогдоно.')}</p>

          <p className="trip-reference">
            <span>{t('Хүсэлтийн дугаар')}</span>
            <b>{formatReference(reference ?? '')}</b>
          </p>
          <p className="admin-muted">
            {t('Энэ дугаараа хадгалаарай. Мэдээллээ устгуулах бол бидэнд энэ дугаараа хэлнэ.')}
          </p>

          {/* Repeated after submitting, now naming the reference they hold — the deletion line
              is the one sentence that only becomes actionable at this point. */}
          <PrivacyNotice kind="tripRequest" reference={formatReference(reference ?? '')} />

          <div className="dlg-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('Хаах')}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
