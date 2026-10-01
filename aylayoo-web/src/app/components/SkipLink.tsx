'use client';

import { useLang } from '../../lib/i18n';

/* Jumps past the header's six-item nav straight to the content.
 *
 * Not in the design, which had no skip link at all. Added because the header is sticky and
 * every keyboard user would otherwise tab through the whole nav, the language select, the
 * search button and the login button before reaching anything they came for.
 *
 * It targets <main id="top">, the same anchor the logo uses.
 */
export function SkipLink() {
  const { t } = useLang();
  return (
    <a className="skip-link" href="#top">
      {t('Үндсэн агуулга руу шилжих')}
    </a>
  );
}
