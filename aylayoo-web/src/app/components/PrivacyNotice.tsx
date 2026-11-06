'use client';

import { useLang } from '../../lib/i18n';
import { TEAM_EMAIL } from '../../lib/seo';

/* What we collect, who sees it, how long we keep it, how to have it deleted.
 *
 * On the form itself, not behind a link to a policy. A traveller is handing over a phone number
 * to be passed to a stranger, and the four things they would want to know are short enough to
 * fit next to the submit button — so there is no good reason to make them go and look.
 *
 * Deliberately written as four plain sentences rather than legal prose, and deliberately
 * specific: "90 days after the later of your last trip day or the closure" rather than "for as
 * long as necessary". Every claim here is enforced somewhere in aylayoo-service, and that is the
 * point — if one of these sentences stops being true, a test should fail before a traveller is
 * misled:
 *
 *   who sees the contact   admin-trips.ts stages it behind `acceptedAt` (trips.spec.ts)
 *   how long it is kept    lib/retention.ts, run daily by the Cron Trigger (retention.spec.ts)
 *   how to delete it       the reference AND the contact used — both halves (trips.spec.ts)
 *
 * The retention sentence used to be the weakest thing on this form: it named two dates that
 * nothing enforced, because the "cleanup pass" it described did not exist. It now does, and the
 * wording matches it term for term — the LATER of the last preferred day and the closure, then
 * 90 days; the whole request at 24 months.
 *
 * The deletion line names BOTH halves on purpose. Erasure is not self-service: an admin matches
 * the reference against the contact detail the traveller used, because that contact is the only
 * thing proving the request is theirs. A notice asking only for the reference would send people
 * to us with half of what we need. It also names the address, since erasure happens by a human
 * reading an email and not by a button on this form.
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
          <li>{t('Бид таны нэр, холбоо барих мэдээлэл, хүсэлтийн тайлбар, хүний тоо, хүссэн өдрүүдийг авна.')}</li>
        ) : (
          <li>{t('Бидэнд: таны сонгосон нэр, үнэлгээ, сэтгэгдэл.')}</li>
        )}

        {kind === 'tripRequest' ? (
          <li>{t('Эдгээрийг манай баг харна. Хөтөч таны нэр, тайлбар, өдрүүдийг хүсэлтийг хүлээн авахаас өмнө, харин холбоо барих мэдээллийг зөвхөн хүлээн авсны дараа харна.')}</li>
        ) : (
          <li>{t('Сэтгэгдлийг манай баг уншиж, нийтлэхээс өмнө шалгана. Нийтлэгдсэний дараа сонгосон нэр, үнэлгээ, сэтгэгдэл нь олон нийтэд харагдана.')}</li>
        )}

        {kind === 'tripRequest' ? (
          <li>{t('Холбоо барих мэдээллийг аяллын сүүлийн өдөр эсвэл хүсэлт хаагдсан өдрийн аль хожуу нь болсноос хойш 90 хоногийн дараа устгана. Хүсэлтийг 24 сарын дараа бүрэн устгана.')}</li>
        ) : (
          <li>{t('Нийтэлсэн сэтгэгдлийг хугацаагүй хадгална. Сэтгэгдэлд холбоо барих хаяг байдаггүй.')}</li>
        )}

        <li>
          {reference
            ? t(`Устгуулахыг хүсвэл ${reference} лавлах код болон ашигласан холбоо барих мэдээллээ бичиж бидэнтэй холбогдоно уу.`)
            : t('Устгуулахыг хүсвэл хүсэлт илгээсний дараа өгөх лавлах код болон ашигласан холбоо барих мэдээллээ бичиж бидэнтэй холбогдоно уу.')}
          {' '}
          <a href={`mailto:${TEAM_EMAIL}`}>{TEAM_EMAIL}</a>
        </li>
      </ul>
    </div>
  );
}
