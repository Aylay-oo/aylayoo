'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ApiError, registerGuide, type Aimag, type GuideType,
} from '../../lib/api';
import { useDialogs } from '../../lib/dialogs';
import { LANGUAGE_OPTIONS } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import { BigCheckIcon } from './icons';

/* Guide registration, opened from the header, the footer, and the guides section's empty
 * state.
 *
 * The design only stubbed this — the same three-field dialog as the contact form. It posts to
 * POST /api/guides/register for real, as multipart with an optional photo, and the result is
 * saved as pending for review rather than published.
 *
 * There is no traveller login behind the header's "Нэвтрэх / Бүртгүүлэх": there are no
 * traveller accounts, so it opens this instead of pretending to sign anyone in.
 */

type Phase = 'form' | 'sending' | 'done';

const TYPES: readonly { key: GuideType; label: string }[] = [
  { key: 'individual', label: 'Аяллын хөтөч' },
  { key: 'driver', label: 'Жолооч' },
  { key: 'company', label: 'Аяллын компани' },
];

const TRIP_TYPES = [
  { key: 'countryside' as const, label: 'Хөдөөгийн аялал' },
  { key: 'city' as const, label: 'Хотын аялал' },
];

export function RegisterDialog({ aimags }: { aimags: Aimag[] }) {
  const { t, pick } = useLang();
  const { registerOpen, closeRegister, showToast } = useDialogs();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [phase, setPhase] = useState<Phase>('form');
  const [type, setType] = useState<GuideType>('individual');
  const [languages, setLanguages] = useState<string[]>(['mn']);
  const [tripTypes, setTripTypes] = useState<('city' | 'countryside')[]>(['countryside']);
  const [aimagIds, setAimagIds] = useState<number[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (registerOpen && !dialog.open) {
      // A fresh form each time it opens, so a previous attempt does not bleed through.
      setPhase('form');
      setType('individual');
      setLanguages(['mn']);
      setTripTypes(['countryside']);
      setAimagIds([]);
      setPhoto(null);
      setError(null);
      dialog.showModal();
    } else if (!registerOpen && dialog.open) {
      dialog.close();
    }
  }, [registerOpen]);

  if (!registerOpen) {
    return <dialog ref={dialogRef} aria-label={t('Хөтчөөр бүртгүүлэх')} />;
  }

  const toggle = <T,>(list: T[], value: T): T[] =>
    (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'sending') return;

    const form = new FormData(event.currentTarget);
    const text = (field: string) => String(form.get(field) ?? '').trim();
    const car = text('car');

    /* Checked here as well as by the API, so the visitor is told which box to fix instead of
     * being handed a validation error for a field they cannot see. */
    if (aimagIds.length === 0) return setError('Дор хаяж нэг аймаг сонгоно уу');
    if (languages.length === 0) return setError('Дор хаяж нэг хэл сонгоно уу');
    if (tripTypes.length === 0) return setError('Дор хаяж нэг аяллын төрөл сонгоно уу');
    if (type === 'driver' && !car) return setError('Жолооч бол машинаа бичнэ үү');

    const years = text('experienceYears');
    setError(null);
    setPhase('sending');
    try {
      await registerGuide({
        type,
        name: text('name'),
        phone: text('phone'),
        email: text('email'),
        website: text('website') || undefined,
        bioMn: text('bio') || undefined,
        languages,
        tripTypes,
        aimagIds,
        experienceYears: years ? Number(years) : undefined,
        routeMn: text('route') || undefined,
        // Only a driver may send a car; the API rejects one from anybody else.
        car: type === 'driver' ? car : undefined,
      }, photo);
      setPhase('done');
    } catch (cause) {
      setPhase('form');
      const message = cause instanceof ApiError
        ? cause.message
        : t('Бүртгүүлэх хүсэлт илгээхэд алдаа гарлаа');
      setError(null);
      showToast(message);
    }
  }

  return (
    <dialog ref={dialogRef} className="dlg-wide" onClose={closeRegister}>
      <form className="dlg dlg-scroll" onSubmit={onSubmit}>
        {phase !== 'done' ? (
          <div>
            <h3>{t('Хөтчөөр бүртгүүлэх')}</h3>
            <p>{t('Туршлага, хэл, ажилладаг аймгуудаа бичээд илгээнэ үү. Бид шалгаад баталгаажуулна.')}</p>

            <span className="fld"><span>{t('Та хэн бэ?')}</span></span>
            <div className="pick" role="group" aria-label={t('Та хэн бэ?')}>
              {TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={type === key}
                  onClick={() => setType(key)}
                >
                  {t(label)}
                </button>
              ))}
            </div>

            <label className="fld">
              <span>{t(type === 'company' ? 'Байгууллагын нэр' : 'Нэр')}</span>
              <input required name="name" autoComplete="name" minLength={2} maxLength={120} />
            </label>

            <div className="fld-row">
              <label className="fld">
                <span>{t('Утас')}</span>
                <input required name="phone" autoComplete="tel" inputMode="tel" minLength={6} />
              </label>
              <label className="fld">
                <span>{t('Имэйл')}</span>
                <input required name="email" type="email" autoComplete="email" />
              </label>
            </div>

            <div className="fld-row">
              <label className="fld">
                <span>{t('Туршлага (жил)')}</span>
                <input name="experienceYears" type="number" min={0} max={70} inputMode="numeric" />
              </label>
              <label className="fld">
                <span>{t('Вэб сайт')}</span>
                <input name="website" type="url" placeholder="https://" />
              </label>
            </div>

            {type === 'driver' && (
              <label className="fld">
                <span>{t('Машин')}</span>
                <input name="car" maxLength={120} placeholder={t('Жишээ нь: Land Cruiser 200')} />
              </label>
            )}

            <span className="fld"><span>{t('Ажилладаг аймгууд')}</span></span>
            <div className="pick scroll" role="group" aria-label={t('Ажилладаг аймгууд')}>
              {aimags.map((aimag) => (
                <button
                  key={aimag.id}
                  type="button"
                  aria-pressed={aimagIds.includes(aimag.id)}
                  onClick={() => setAimagIds((current) => toggle(current, aimag.id))}
                >
                  {pick(aimag.nameMn, aimag.nameEn)}
                </button>
              ))}
            </div>

            <span className="fld"><span>{t('Хэлүүд')}</span></span>
            <div className="pick" role="group" aria-label={t('Хэлүүд')}>
              {LANGUAGE_OPTIONS.map(({ code, name }) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={languages.includes(code)}
                  onClick={() => setLanguages((current) => toggle(current, code))}
                >
                  {t(name)}
                </button>
              ))}
            </div>

            <span className="fld"><span>{t('Аяллын төрөл')}</span></span>
            <div className="pick" role="group" aria-label={t('Аяллын төрөл')}>
              {TRIP_TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tripTypes.includes(key)}
                  onClick={() => setTripTypes((current) => toggle(current, key))}
                >
                  {t(label)}
                </button>
              ))}
            </div>

            <label className="fld">
              <span>{t('Байнга явдаг чиглэл')}</span>
              <input name="route" maxLength={300} placeholder={t('Жишээ нь: Хөвсгөл, Архангай')} />
            </label>

            <label className="fld">
              <span>{t('Танилцуулга')}</span>
              <textarea name="bio" maxLength={2000} />
            </label>

            <label className="fld">
              <span>{t('Зураг (сонголтоор)')}</span>
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>

            {error && <p className="fld-error">{t(error)}</p>}

            <div className="dlg-actions">
              <button
                type="button"
                className="btn btn-plain"
                onClick={closeRegister}
                disabled={phase === 'sending'}
              >
                {t('Болих')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={phase === 'sending'}>
                {phase === 'sending' ? t('Илгээж байна…') : t('Бүртгүүлэх')}
              </button>
            </div>
          </div>
        ) : (
          <div className="done show">
            <div className="city-ic">
              <BigCheckIcon />
            </div>
            <h3>{t('Хөтчөөр бүртгүүлэх хүсэлт илгээгдлээ')}</h3>
            <p style={{ color: 'var(--muted)', margin: '8px 0 18px' }}>
              {t('Бид шалгаад 24 цагийн дотор тантай холбогдоно.')}
            </p>
            <button type="button" className="btn btn-primary" onClick={closeRegister}>
              {t('Хаах')}
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}
