'use client';

import { useState } from 'react';
import { LangProvider, useLang } from '../../lib/i18n';
import { DetailChrome } from '../components/DetailChrome';
import { Events } from './Events';
import { Food } from './Food';
import { Itineraries } from './Itineraries';
import { Phrasebook } from './Phrasebook';
import { PracticalGuide } from './PracticalGuide';
import { WalkingRoutes } from './WalkingRoutes';

/* /ulaanbaatar — the city section.
 *
 * DetailChrome rather than the home page's <Header />, for the reason written in that file:
 * every link in the home nav is a bare hash that resolves to nothing off the home page, and
 * each one drives map state this page has no map for. What this page needs from the chrome is
 * the same two things a detail page needs — a way back and the language switch.
 *
 * Six tabs, and only the open one is mounted. That is not a micro-optimisation: each tab owns
 * its own fetch, so mounting all six would fire six requests to show one, and coming back to a
 * tab re-fetches, which is what you want from a page whose content the team is editing live.
 */

type Tab = 'itineraries' | 'routes' | 'food' | 'guide' | 'phrases' | 'events';

const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'itineraries', label: 'Аяллын хөтөлбөр' },
  { key: 'routes', label: 'Явган маршрут' },
  { key: 'food', label: 'Хоол, ресторан' },
  { key: 'guide', label: 'Хэрэгтэй мэдээлэл' },
  { key: 'phrases', label: 'Хэллэг' },
  { key: 'events', label: 'Арга хэмжээ' },
];

const PANELS: Record<Tab, () => React.ReactNode> = {
  itineraries: Itineraries,
  routes: WalkingRoutes,
  food: Food,
  guide: PracticalGuide,
  phrases: Phrasebook,
  events: Events,
};

function Body() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('itineraries');
  const Panel = PANELS[tab];
  const current = TABS.find((entry) => entry.key === tab);

  return (
    <DetailChrome crumbs={[{ label: t('Нүүр'), href: '/' }, { label: t('Улаанбаатар') }]}>
      <div className="city-page">
        <header className="city-head">
          <span className="kicker">{t('Нийслэл хот')}</span>
          <h1>{t('Улаанбаатар')}</h1>
          <p className="d-lede">
            {t('Хөтөлбөр, явган маршрут, хоолны газар, хэрэгтэй мэдээлэл, хэллэг, арга хэмжээ — нэг хуудсанд.')}
          </p>
        </header>

        <div className="filters city-tabs" role="tablist" aria-label={t('Хэсэг')}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              aria-controls={`city-${key}`}
              onClick={() => setTab(key)}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {/* The panel is labelled by its own tab's name rather than repeating it, so a screen
            reader announces the section a visitor has just switched to. */}
        <section
          id={`city-${tab}`}
          role="tabpanel"
          aria-label={t(current?.label ?? 'Хэсэг')}
          tabIndex={-1}
        >
          <Panel />
        </section>
      </div>
    </DetailChrome>
  );
}

export function UlaanbaatarPage({ titles }: { titles: { mn: string; en: string } }) {
  return (
    <LangProvider titles={titles}>
      <Body />
    </LangProvider>
  );
}
