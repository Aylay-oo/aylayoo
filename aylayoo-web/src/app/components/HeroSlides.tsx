import Image from 'next/image';
import { photoUrl } from '../../lib/photos';

/* The four cross-fading photos behind the hero.
 *
 * The mockup set these as CSS `background-image` on four divs. Here each div holds a
 * next/image instead, so the photos are resized and re-encoded per device — the animation
 * is untouched, because `heroDissolve` runs on the wrapper div, not the image. The
 * 28s/7s-apart timing comes from CSS (`.hero-slide:nth-child(n)`), so the order matters. */
const HERO_PHOTOS = ['hero1', 'hero2', 'hero3', 'hero4'] as const;

export function HeroSlides() {
  return (
    <div className="hero-slides" aria-hidden="true">
      {HERO_PHOTOS.map((key, i) => (
        <div className="hero-slide" key={key}>
          <Image
            src={photoUrl(key)}
            alt=""
            fill
            // The first slide is the largest thing on screen at first paint, so it is the
            // LCP element and must not be lazy-loaded.
            priority={i === 0}
            sizes="100vw"
            // globals.css gives object-fit:cover to .thumb/.card-media/.tile-slide/.ms-slide
            // images but not to these, which were background-image in the design.
            style={{ objectFit: 'cover' }}
          />
        </div>
      ))}
    </div>
  );
}
