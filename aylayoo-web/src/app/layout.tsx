import type { Metadata, Viewport } from 'next';
import { Manrope, Montserrat, Playfair_Display } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'АЯЛАЯ ӨӨ | Монголын аяллын платформ',
  description:
    'Монголд аялах гэж буй дотоод болон гадаадын жуулчдад аяллын чиглэл, үзэсгэлэнт газрууд, ' +
    'хөтөч болон аяллын компаниудын мэдээллийг нэг дороос олж, аяллаа төлөвлөхөд туслах веб платформ.',
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
      <body>{children}</body>
    </html>
  );
}
