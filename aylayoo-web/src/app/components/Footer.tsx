'use client';

import { useDialogs } from '../../lib/dialogs';
import { useLang } from '../../lib/i18n';
import { useTravelState } from '../../lib/travel-state';

export function Footer() {
  const { t } = useLang();
  const { setMode } = useTravelState();
  const { openRegister } = useDialogs();

  return (
    <footer id="contact">
      <div className="wrap">
        <div className="f-grid">
          <div>
            <div className="f-logo">
              aylay
              <span className="sun">
                <i />
                <i />
              </span>
            </div>
            <div className="f-tag">uulzayoo taniyoo medeyoo amrayoo</div>
          </div>

          <div>
            <h4>{t('Аялал')}</h4>
            <ul>
              <li><a href="#guides">{t('Хөтөч хайх')}</a></li>
              <li>
                <a href="#where" onClick={() => setMode('country')}>{t('Аймгууд')}</a>
              </li>
              <li><a href="#mustsee">{t('Заавал очих газрууд')}</a></li>
              <li>
                <a href="#where" onClick={() => setMode('city')}>{t('Хотын ойр')}</a>
              </li>
            </ul>
          </div>

          <div>
            <h4>{t('Холбоо барих')}</h4>
            <ul>
              <li>
                {/* The design used an <a href="#">; a button is the honest element for
                    something that opens a form and never navigates. .f-linkbtn in
                    additions.css gives it the surrounding links' look back. */}
                <button type="button" className="f-linkbtn" onClick={openRegister}>
                  {t('Хөтчөөр бүртгүүлэх')}
                </button>
              </li>
              <li><a href="mailto:ayalyoo123@gmail.com">ayalyoo123@gmail.com</a></li>
              <li>{t('Улаанбаатар, Монгол Улс')}</li>
            </ul>
          </div>
        </div>

        <div className="f-bottom">
          <span>© 2026 aylayoo</span>
          <span>{t('Газрын зургийн өгөгдөл: Natural Earth')}</span>
        </div>
      </div>
    </footer>
  );
}
