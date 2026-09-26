'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Place } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { photoKey, photoUrl } from '../../lib/photos';
import { MUST_SHOWCASE, SLUG_TO_ISO } from '../../lib/static-data';
import { useTravelState } from '../../lib/travel-state';
import type { Resource } from '../../lib/use-resource';
import { ChevronLeftIcon, ChevronRightIcon, MetaArrowIcon } from './icons';
import { Notice } from './SectionState';

/* The editorial showcase: one must-see place at a time, framed by two photos.
 *
 * The place itself is API data — its name, blurb, best months and which aimag it is in. The
 * two photos and their captions are presentation, so they come from MUST_SHOWCASE keyed by
 * aimag slug; a must-see place with no entry there still works, using its own imageKey on
 * both sides.
 *
 * The headline prefers must_title/must_summary over the plain name and description, because
 * the design's copy deliberately reads wider than the single place it hangs off — "Хонгорын
 * элс & Баянзаг" over the place "Хонгорын элс".
 */

/** How long each place holds, matching the design's 5.5s and its progress bar. */
const DURATION_MS = 5500;
/** A drag shorter than this is a tap, not a swipe. */
const SWIPE_PX = 40;

export function MustSeeCarousel({ places }: { places: Resource<Place[]> }) {
  const { t, pick } = useLang();
  const { setMode, selectAimag } = useTravelState();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const swipeStart = useRef<number | null>(null);

  const rows = places.data ?? [];
  const count = rows.length;

  /** Moves to an absolute position, wrapping at either end. */
  const go = useCallback((next: number) => {
    setIndex(count === 0 ? 0 : ((next % count) + count) % count);
  }, [count]);

  // Advance on a timer, restarted whenever the place changes so a manual move resets the
  // clock rather than cutting the next one short.
  useEffect(() => {
    if (count <= 1 || paused) return undefined;
    const timer = setTimeout(() => go(index + 1), DURATION_MS);
    return () => clearTimeout(timer);
  }, [index, count, paused, go]);

  // If the list shrinks under us (a retry returning fewer rows), do not point past the end.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  if (places.loading) {
    return (
      <section id="mustsee" aria-label={t('Монголд ирсэн бол заавал очих газрууд')}>
        <MustSeeHeader current={0} total={0} />
        <div className="ms-stage">
          <figure className="ms-card left sk" />
          <div className="ms-center">
            <div className="ms-text">
              <div className="sk sk-line mid" style={{ height: 14 }} />
              <div className="sk sk-line" style={{ height: 34, width: '80%' }} />
              <div className="sk sk-line" />
              <div className="sk sk-line short" />
            </div>
          </div>
          <figure className="ms-card right sk" />
        </div>
      </section>
    );
  }

  if (places.error || count === 0) {
    return (
      <section id="mustsee" aria-label={t('Монголд ирсэн бол заавал очих газрууд')}>
        <MustSeeHeader current={0} total={0} />
        <div className="ms-stage" style={{ gridTemplateColumns: '1fr' }}>
          <div className="ms-center">
            {places.error ? (
              <Notice
                message="Заавал очих газрууд ачаалахад алдаа гарлаа"
                onRetry={places.reload}
              />
            ) : (
              <Notice message="Заавал очих газрууд одоохондоо алга." />
            )}
          </div>
        </div>
      </section>
    );
  }

  const place = rows[Math.min(index, count - 1)];
  const slug = place.aimagSlug ?? '';
  const showcase = MUST_SHOWCASE[slug];
  const ownPhoto = photoKey(place.imageKey, place.nameMn);
  const left = showcase
    ? { photo: photoKey(showcase.left.photo, showcase.left.caption), caption: showcase.left.caption }
    : { photo: ownPhoto, caption: pick(place.nameMn, place.nameEn) };
  const right = showcase
    ? { photo: photoKey(showcase.right.photo, showcase.right.caption), caption: showcase.right.caption }
    : { photo: ownPhoto, caption: pick(place.nameMn, place.nameEn) };

  const title = pick(place.mustTitleMn ?? place.nameMn, place.mustTitleEn ?? place.nameEn);
  const summary = pick(
    place.mustSummaryMn ?? place.descriptionMn,
    place.mustSummaryEn ?? place.descriptionEn,
  );
  const aimagName = pick(place.aimagNameMn, place.aimagNameEn);
  const months = pick(place.bestMonthsMn, place.bestMonthsEn);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') go(index + 1);
    if (event.key === 'ArrowLeft') go(index - 1);
  }

  return (
    <section
      id="mustsee"
      aria-roledescription="carousel"
      aria-label={t('Монголд ирсэн бол заавал очих газрууд')}
      onKeyDown={onKeyDown}
      /* Not in the design, and the one place this deviates: the autoplay stops while the
       * section has focus. The text panel is an aria-live region, so leaving it rotating
       * under a keyboard or screen-reader user would re-announce it every 5.5 seconds while
       * they were trying to read it. Nothing about the appearance changes. */
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <MustSeeHeader current={index + 1} total={count} />

      <div
        className="ms-stage"
        onPointerDown={(event) => {
          swipeStart.current = Number.isFinite(event.clientX) ? event.clientX : null;
        }}
        onPointerUp={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          /* Both coordinates have to be real numbers before this counts as a drag. A pointer
           * event without them — synthetic, or from assistive technology — would otherwise
           * compare NaN, which is never <= the threshold, and every tap would turn the page. */
          if (start === null || !Number.isFinite(event.clientX)) return;
          if (Math.abs(event.clientX - start) <= SWIPE_PX) return;
          go(index + (event.clientX < start ? 1 : -1));
        }}
      >
        <ShowcaseCard side="left" photo={left.photo} caption={left.caption} />

        <div className="ms-center">
          {/* Keyed by place so React remounts it, which replays the staggered entrance the
              design gave these children. */}
          <div className="ms-text" key={place.id} aria-live="polite">
            <div className="ms-meta">
              <span>{t(aimagName)}</span>
              {months && (
                <>
                  <MetaArrowIcon />
                  <span>{t(months)}</span>
                </>
              )}
            </div>
            <h3 className="ms-title">{t(title)}</h3>
            <p className="ms-desc">{t(summary)}</p>
            {/* The design showed a rating here. Places have none in the database and we do
                not invent one, so the line is simply absent. */}
            <button
              className="ms-btn"
              type="button"
              onClick={() => {
                setMode('country');
                const iso = SLUG_TO_ISO[slug];
                if (iso) selectAimag(iso);
                document.getElementById('where')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('Газрын зураг дээр харах')}
            </button>
          </div>

          <div className="ms-ctrl">
            <button
              className="ms-arrow"
              type="button"
              onClick={() => go(index - 1)}
              aria-label={t('Өмнөх газар')}
            >
              <ChevronLeftIcon size={16} />
            </button>
            <ProgressBar index={index} count={count} paused={paused} />
            <button
              className="ms-arrow"
              type="button"
              onClick={() => go(index + 1)}
              aria-label={t('Дараагийн газар')}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>

          <div className="ms-dots" role="tablist" aria-label={t('Газар сонгох')}>
            {rows.map((row, i) => (
              <button
                key={row.id}
                role="tab"
                type="button"
                aria-selected={i === index}
                aria-label={pick(row.mustTitleMn ?? row.nameMn, row.mustTitleEn ?? row.nameEn)}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>

        <ShowcaseCard side="right" photo={right.photo} caption={right.caption} />
      </div>
    </section>
  );
}

function MustSeeHeader({ current, total }: { current: number; total: number }) {
  const { t } = useLang();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="ms-top">
      <span className="ms-spacer" aria-hidden="true" />
      <h2 className="ms-brand">{t('Монголд ирсэн бол заавал очих газрууд')}</h2>
      <span className="ms-pill" aria-live="polite">
        {pad(current)} / {pad(total)}
      </span>
    </div>
  );
}

/** One side card. Only the active photo is shown; the CSS cross-fades between them. */
function ShowcaseCard({
  side, photo, caption,
}: { side: 'left' | 'right'; photo: string; caption: string }) {
  const { t } = useLang();
  return (
    <figure className={`ms-card ${side}`}>
      {/* Keyed so the fade-in transition replays when the place changes. */}
      <div className="ms-slide on" key={photo + caption}>
        <Image
          src={photoUrl(photo)}
          alt=""
          fill
          sizes="(max-width: 900px) 50vw, 440px"
          style={{ objectFit: 'cover' }}
          priority
        />
        <figcaption>{t(caption)}</figcaption>
      </div>
    </figure>
  );
}

/** The bar between the arrows, refilling once per place. */
function ProgressBar({ index, count, paused }: { index: number; count: number; paused: boolean }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }, []);

  /* Under reduced motion the design filled the bar to show position instead of animating it,
   * which also makes it a useful progress indicator when nothing is moving. */
  if (reduceMotion) {
    return (
      <div className="ms-bar" aria-hidden="true">
        <i style={{ width: `${((index + 1) / Math.max(count, 1)) * 100}%` }} />
      </div>
    );
  }

  return (
    <div className="ms-bar" aria-hidden="true">
      {/* The design forced a reflow to restart this animation; a key does it declaratively.
          Paused gets no animation at all, so the bar does not imply time is passing. */}
      <i
        key={index}
        className={paused ? undefined : 'run'}
        style={{ '--ms-dur': `${DURATION_MS}ms` } as React.CSSProperties}
      />
    </div>
  );
}
