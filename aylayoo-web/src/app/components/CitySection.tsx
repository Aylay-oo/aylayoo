'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDialogs } from '../../lib/dialogs';
import { useLang } from '../../lib/i18n';
import { photoKey, photoUrl } from '../../lib/photos';
import { CITY, TRIP_RADII, TRIPS, type CityTile, type TripRadius } from '../../lib/static-data';
import { BuildingsIcon, CarIcon, CITY_TILE_ICONS } from './icons';

/* Ulaanbaatar: four themed tours, then the short trips out of town.
 *
 * Entirely static — these are editorial suggestions rather than records, so they live in
 * static-data.ts. That also means this whole panel works with the API down.
 */

export function CitySection() {
  const { t } = useLang();
  const { openContact } = useDialogs();
  const [radius, setRadius] = useState<TripRadius>(50);

  return (
    <>
      <div className="city-card">
        <div className="city-ic">
          <BuildingsIcon />
        </div>
        <h3>{t('Улаанбаатар хотын аялал')}</h3>
        <p>
          {t('Нийслэл хотын музей, соёлын дурсгалт газрууд, шилдэг ресторан, шөнийн амьдрал болон хотын тусгай аяллуудыг санал болгож байна.')}
        </p>

        <div className="city-tiles" id="cityTiles">
          {CITY.map((tile) => (
            <Tile key={tile.name} tile={tile} />
          ))}
        </div>

        {/* The tiles above are editorial suggestions that have never changed; everything the
            team actually publishes about the city lives on /ulaanbaatar, so this is the way
            through to it. First, and primary, because it is the more useful of the two. */}
        <div className="city-actions">
          <Link className="btn btn-primary" href="/ulaanbaatar">
            {t('Улаанбаатарын хөтөлбөр, маршрут, хэллэг')}
          </Link>
          {/* Guided tours, named on the home page rather than left as the second of seven tabs
              somebody has to find. The hash opens that tab directly — see UlaanbaatarPage.
              Safe when nothing is published: the tab owns its own empty state and says so, which
              is a better answer than hiding the link and leaving the feature undiscoverable. */}
          <Link className="btn btn-ghost" href="/ulaanbaatar#tours">
            {t('Хөтөчтэй аялал')}
          </Link>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => openContact({ kind: 'contact', subject: 'Улаанбаатар хотын хөтөч' })}
          >
            {t('Хотын хөтөч нартай холбогдох')}
          </button>
        </div>
      </div>

      <div className="radius">
        <div className="s-head center">
          <span className="kicker">{t('Богино хугацааны аялал')}</span>
          <h2>{t('Улаанбаатараас ойрын аяллууд')}</h2>
          <p>{t('Хүссэн зайгаа сонгоод 1–2 өдрийн богино аяллаа төлөвлөөрэй.')}</p>
          <div
            className="radius-tabs"
            role="tablist"
            aria-label={t('Зай')}
            style={{ marginTop: 20 }}
          >
            {TRIP_RADII.map((km) => (
              <button
                key={km}
                role="tab"
                type="button"
                aria-selected={radius === km}
                onClick={() => setRadius(km)}
              >
                {t(`${km} км зайд`)}
              </button>
            ))}
          </div>
        </div>

        <div className="trip-grid" id="tripGrid" aria-live="polite">
          {TRIPS[radius].map((trip) => (
            <article className="card" key={trip.name}>
              <div className="card-media">
                <Image
                  src={photoUrl(photoKey(trip.imageKey, trip.name))}
                  alt={t(trip.name)}
                  fill
                  sizes="(max-width: 620px) 100vw, 360px"
                  style={{ objectFit: 'cover' }}
                />
                <span className="tag right">{t(`≈${trip.km} км`)}</span>
              </div>
              <div className="card-body">
                <h3>{t(trip.name)}</h3>
                <p>{t(trip.desc)}</p>
                <div className="card-foot">
                  <span className="fl">
                    <CarIcon />
                    {/* One string, so its own rule turns it into "Duration: 1 h". */}
                    {t(`Хугацаа: ${trip.time}`)}
                  </span>
                  <button
                    className="linkbtn"
                    type="button"
                    onClick={() => openContact({ kind: 'booking', subject: trip.name })}
                  >
                    {t('Захиалах')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

/** How long each tile photo shows while hovered, and on a touch screen. */
const HOVER_MS = 1500;
const AUTOPLAY_MS = 3000;

function Tile({ tile }: { tile: CityTile }) {
  const { t } = useLang();
  const Icon = CITY_TILE_ICONS[tile.icon];
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = tile.slides.length;

  /* Hover or focus runs the slideshow; leaving resets to the first photo. On a touch screen
   * there is no hover, so the design started them all on a stagger instead — and honoured
   * prefers-reduced-motion by not starting them at all. */
  useEffect(() => {
    const noHover = window.matchMedia('(hover: none)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!noHover || reduceMotion) return undefined;

    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count]);

  function start() {
    if (timer.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setIndex((i) => (i + 1) % count);
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), HOVER_MS);
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setIndex(0);
  }

  // Clean up if the tile unmounts mid-hover.
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return (
    <div
      className="tile"
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
    >
      <div className="tile-name">
        <Icon />
        <b>{t(tile.name)}</b>
      </div>

      <div
        className="tile-media"
        tabIndex={0}
        aria-label={`${t(tile.name)}: ${tile.slides.map(([, caption]) => t(caption)).join(', ')}`}
      >
        <div className="tile-strip" style={{ transform: `translateX(${-index * 100}%)` }}>
          {tile.slides.map(([photo, caption]) => (
            <div className="tile-slide" key={photo + caption}>
              <Image
                src={photoUrl(photoKey(photo, null))}
                alt=""
                fill
                sizes="(max-width: 860px) 50vw, 240px"
                style={{ objectFit: 'cover' }}
              />
              <span className="tile-cap">{t(caption)}</span>
            </div>
          ))}
        </div>
        <div className="tile-dots">
          {tile.slides.map(([photo], i) => (
            <i className={i === index ? 'on' : undefined} key={photo} />
          ))}
        </div>
      </div>

      <span>{t(tile.desc)}</span>
    </div>
  );
}
