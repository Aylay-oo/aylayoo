import type { Metadata, Viewport } from 'next';
import { Manrope, Montserrat, Playfair_Display } from 'next/font/google';
import { DEFAULT_OG_IMAGE, HOME_TITLES, SITE_NAME, SITE_URL } from '../lib/seo';
import { Analytics } from './components/Analytics';
import './globals.css';
// After globals.css on purpose: additions.css only styles elements the design never had,
// and loading later means it can lean on the palette without fighting the cascade.
import './additions.css';

/* The design pulled these three from a Google Fonts <link>. next/font self-hosts them
 * instead — same families, same weights, same Cyrillic coverage, but no third-party
 * request and no flash of unstyled text. Each exposes a CSS variable that globals.css
 * feeds into --font-h / --font-b / the Playfair stack. */
const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600'],
  variable: '--font-playfair',
  display: 'swap',
});

const DESCRIPTION =
  'Монголд аялах гэж буй дотоод болон гадаадын жуулчдад аяллын чиглэл, үзэсгэлэнт газрууд, '
  + 'хөтөч болон аяллын компаниудын мэдээллийг нэг дороос олж, аяллаа төлөвлөхөд туслах веб платформ.';

export const metadata: Metadata = {
  /* Every relative URL in any page's metadata resolves against this — which is what makes an
   * og:image absolute by the time a crawler reads it. It also settles which of the three
   * hostnames the site answers on is the canonical one: aylayoo.com, not www and not the
   * original workers.dev address. */
  metadataBase: new URL(SITE_URL),
  title: HOME_TITLES.mn,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: HOME_TITLES.mn,
    description: DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'mn_MN',
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  twitter: { card: 'summary_large_image', title: HOME_TITLES.mn, description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* lang starts as "mn" and the language switch updates it on the client, because
     * globals.css keys off it: `html[lang="en"] .hero h1` drops the uppercasing that only
     * suits Mongolian. data-theme="light" is what the mockup set; its dark-mode blocks sit
     * behind `[data-theme="never-dark"]` and `@media not all`, so they never apply. */
    <html
      lang="mn"
      data-theme="light"
      style={{ colorScheme: 'light' }}
      className={`${montserrat.variable} ${manrope.variable} ${playfair.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
