import type { Metadata } from 'next';
import { SITE_NAME, clamp, ogCard, pageTitle } from '../../lib/seo';
import { UlaanbaatarPage } from './UlaanbaatarPage';

/* /ulaanbaatar
 *
 * The one page in this section whose content is entirely client-fetched — each tab owns its own
 * request — so there is nothing for the server to load. Its metadata is therefore static, and
 * unlike the detail pages it needs no `force-dynamic`: what Next renders here is the same shell
 * every time, and the tabs fill it in.
 */

const TITLES = {
  mn: pageTitle('Улаанбаатар'),
  en: 'Ulaanbaatar | AYLAYOO',
};

const DESCRIPTION =
  'Улаанбаатар хотод юу хийх вэ: 1, 2, 3 өдрийн аяллын хөтөлбөр, явган маршрутууд, хоолны '
  + 'газрууд, хэрэгтэй мэдээлэл, монгол хэллэг, болон энэ долоо хоногийн арга хэмжээнүүд.';

export const metadata: Metadata = {
  title: TITLES.mn,
  description: clamp(DESCRIPTION),
  alternates: { canonical: '/ulaanbaatar' },
  openGraph: {
    title: TITLES.mn,
    description: clamp(DESCRIPTION),
    url: '/ulaanbaatar',
    siteName: SITE_NAME,
    locale: 'mn_MN',
    // A section landing page, not an article — unlike the itinerary and route pages under it.
    type: 'website',
    images: [{ url: ogCard('ub_aerial'), alt: 'Улаанбаатар' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLES.mn,
    description: clamp(DESCRIPTION),
    images: [ogCard('ub_aerial')],
  },
};

export default function Page() {
  return <UlaanbaatarPage titles={TITLES} />;
}
