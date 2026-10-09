'use client';

import { useEffect, useState } from 'react';
import { useLang } from '../../lib/i18n';

/* The hero headline, showing one phrase at a time: Аялая өө → Уулзъя өө → Амрая өө → repeat.
 *
 * The whole line stays in the <h1> as a visually hidden span, and the cycling copy is
 * aria-hidden. Without that split, a screen reader or a crawler reading the heading at any
 * moment would get a third of it — whichever phrase happened to be on screen.
 *
 * The phrases go through t() individually, so each needs its own dictionary entry (see
 * i18n-extra.ts); the design's dictionary only had the comma-joined line.
 */

/** The three phrases, in the order the full headline reads them. */
const PHRASES = ['Аялая өө', 'Уулзъя өө', 'Амрая өө'] as const;

/** What the h1 announces, and what the page is indexed on. */
const FULL_HEADLINE = 'Аялая өө, уулзъя өө, амрая өө';

/** How long one phrase stays on screen. The CSS transition is shorter, so it settles. */
const PHRASE_MS = 2500;

/* Which of the three stacked phrases this one is: the one on screen, the one it has just
 * replaced, or the one waiting below. Since they always cycle in order, the phrase being
 * left behind is simply the one before the current index — no second piece of state. */
function className(i: number, index: number): string | undefined {
  if (i === index) return 'on';
  if (i === (index + PHRASES.length - 1) % PHRASES.length) return 'out';
  return undefined;
}

export function HeroHeadline() {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  /* Starts false so the server's HTML and the first client render agree; the real answer
   * arrives in the effect below, after hydration. */
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    function stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
    }

    function start() {
      if (timer === null) {
        timer = setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), PHRASE_MS);
      }
    }

    /* A hidden tab throttles timers to roughly one a minute, which would leave the headline
     * mid-transition and then race through several phrases on return. Nothing is being read
     * while the tab is in the background anyway, so the cycle just stops and resumes. */
    function onVisibilityChange() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reduceMotion]);

  /* Nothing may move, so all three phrases are shown at once — the headline as it reads, and
   * as it looked before the animation existed. */
  if (reduceMotion) return <h1>{t(FULL_HEADLINE)}</h1>;

  return (
    <h1>
      <span className="sr">{t(FULL_HEADLINE)}</span>
      <span className="hero-cycle" aria-hidden="true">
        {PHRASES.map((phrase, i) => (
          <span key={phrase} className={className(i, index)}>
            {t(phrase)}
          </span>
        ))}
      </span>
    </h1>
  );
}
