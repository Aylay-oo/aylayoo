'use client';

import { useLang } from '../../lib/i18n';
import { useTravelState, type GuideFilter, type TravelMode } from '../../lib/travel-state';
import {
  CompanyIcon, DocumentIcon, GuidePersonIcon, MapLayersIcon, RouteMountainIcon, StarOutlineIcon,
} from './icons';

/* The six round shortcuts under the hero. Beyond jumping, some of them set the travel mode
 * or pre-filter the guides — the design's [data-mode] and [data-filter] attributes. */
type QuickLink = {
  label: string;
  href: string;
  Icon: (props: { size?: number }) => React.JSX.Element;
  mode?: TravelMode;
  filter?: GuideFilter;
};

const LINKS: readonly QuickLink[] = [
  { label: 'Аяллын чиглэл', href: '#where', Icon: RouteMountainIcon, mode: 'country' },
  { label: 'Хөтөч', href: '#guides', Icon: GuidePersonIcon, filter: 'guide' },
  { label: 'Аяллын компани', href: '#guides', Icon: CompanyIcon, filter: 'company' },
  { label: 'Монголын тухай', href: '#mustsee', Icon: DocumentIcon },
  { label: 'Газрын зураг', href: '#where', Icon: MapLayersIcon, mode: 'country' },
  { label: 'Сэтгэгдэл & Рейтинг', href: '#guides', Icon: StarOutlineIcon },
];

export function QuickLinks() {
  const { t } = useLang();
  const { setMode, setGuideFilter } = useTravelState();

  return (
    <nav className="quick" aria-label={t('Хурдан холбоос')}>
      <div className="wrap">
        <ul>
          {LINKS.map(({ label, href, Icon, mode, filter }) => (
            <li key={label}>
              <a
                href={href}
                onClick={() => {
                  if (mode) setMode(mode);
                  if (filter) setGuideFilter(filter);
                }}
              >
                <span className="q-ic">
                  <Icon />
                </span>
                {t(label)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
