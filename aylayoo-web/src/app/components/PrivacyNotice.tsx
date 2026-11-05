'use client';

import { useLang } from '../../lib/i18n';

/* What we collect, who sees it, how long we keep it, how to have it deleted.
 *
 * On the form itself, not behind a link to a policy. A traveller is handing over a phone number
 * to be passed to a stranger, and the four things they would want to know are short enough to
 * fit next to the submit button — so there is no good reason to make them go and look.
 *
 * Deliberately written as four plain sentences rather than legal prose, and deliberately
 * specific: "90 days after your trip dates" rather than "for as long as necessary". Every claim
 * here is enforced somewhere in aylayoo-service, and that is the point — if one of these
 * sentences stops being true, a test should fail before a traveller is misled:
 *
 *   who sees the contact   admin-trips.ts stages it behind `acceptedAt` (trips.spec.ts)
 *   how long it is kept    the retention clock on trip_requests.contactClearedAt
 *   how to delete it       the reference, and the erasure lookup needing both halves
 *
 * `kind` exists because a review form collects something different from a trip request, and a
 * notice that overstates what is collected is as misleading as one that understates it.
 */

export type PrivacyNoticeKind = 'tripRequest' | 'review';

export function PrivacyNotice({ kind, reference }: {
  kind: PrivacyNoticeKind;
  /** Shown after submitting, so the sentence about deletion names the handle they now hold. */
  reference?: string;
}) {
  const { t } = useLang();

  return (
    <div className="privacy-notice">
      <h4>{t('Таны мэдээллийн талаар')}</h4>
      <ul>
        {kind === 'tripRequest' ? (
          <li>{t('Бидэнд: таны нэр, холбоо барих хаяг, хүсэлтийн тайлбар, хүний тоо, хүссэн өдрүүд.')}</li>
        ) : (
          <li>{t('Бидэнд: таны сонгосон нэр, үнэлгээ, сэтгэгдэл.')}</li>
        )}

        {kind === 'tripRequest' ? (
          <li>{t('Үүнийг манай баг харна. Хөтөч таны нэр, тайлбар, өдрүүдийг хүсэлтийг хүлээн авахаас нь өмнө, холбоо барих хаягийг зөвхөн хүлээн авсны дараа харна.')}</li>
        ) : (
          <li>{t('Сэтгэгдлийг манай баг уншиж, нийтлэхээс өмнө шалгана. Нийтлэгдсэний дараа сонгосон нэр, үнэлгээ, сэтгэгдэл нь олон нийтэд харагдана.')}</li>
        )}

        {kind === 'tripRequest' ? (
          <li>{t('Холбоо барих хаягийг аяллын өдрөөс эсвэл хүсэлт хаагдсанаас 90 хоногийн дараа устгана. Хүсэлтийг 24 сарын дараа бүрэн устгана.')}</li>
        ) : (
          <li>{t('Нийтэлсэн сэтгэгдлийг хугацаагүй хадгална. Сэтгэгдэлд холбоо барих хаяг байдаггүй.')}</li>
        )}

        <li>
          {reference
            ? t(`Устгуулахыг хүсвэл ${reference} дугаараа хэлж бидэнтэй холбогдоно уу.`)
            : t('Устгуулахыг хүсвэл хүсэлт илгээсний дараа гарах дугаараа хэлж бидэнтэй холбогдоно уу.')}
        </li>
      </ul>
    </div>
  );
}
