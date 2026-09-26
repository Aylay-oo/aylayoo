'use client';

import type { Aimag, Guide, Place } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { useTravelState, type TravelMode } from '../../lib/travel-state';
import type { Resource } from '../../lib/use-resource';
import { Checklist } from './Checklist';
import { CitySection } from './CitySection';
import { InfoCard } from './InfoCard';
import { MapLegend, MongoliaMap } from './MongoliaMap';
import { CityTabIcon, CountryTabIcon } from './icons';
import { Notice } from './SectionState';

/* "Where do you want to go?" — the two travel modes and everything under them.
 *
 * Both panels stay mounted and one is hidden, exactly as the design did with [hidden]: the
 * city tiles keep their slideshow position and the map keeps its selection when the visitor
 * flips between them.
 */

type Tab = {
  mode: TravelMode;
  id: string;
  label: string;
  Icon: (props: { size?: number }) => React.JSX.Element;
};

const TABS: readonly Tab[] = [
  { mode: 'city', id: 'tabCity', label: 'Хотоор аялах', Icon: CityTabIcon },
  { mode: 'country', id: 'tabCountry', label: 'Хөдөөгөөр аялах', Icon: CountryTabIcon },
];

type WhereSectionProps = {
  aimags: Resource<Aimag[]>;
  places: Resource<Place[]>;
  guides: Resource<Guide[]>;
};

export function WhereSection({ aimags, places, guides }: WhereSectionProps) {
  const { t } = useLang();
  const { mode, setMode } = useTravelState();

  const aimagRows = aimags.data ?? [];
  const placeRows = places.data ?? [];
  const guideRows = guides.data ?? [];

  return (
    <section className="block" id="where">
      <div className="wrap">
        <div className="s-head center">
          <span className="kicker">{t('Ухаалаг хайлтын систем')}</span>
          <h2>{t('Хаашаа аялах вэ?')}</h2>
          <p>{t('Хотоор аялах уу, эсвэл хөдөө орон нутгаар уу? Өөрт тохирох горимоо сонгоно уу.')}</p>
          <div className="seg" role="tablist" aria-label={t('Аяллын горим')}>
            {TABS.map(({ mode: tabMode, id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                type="button"
                id={id}
                aria-selected={mode === tabMode}
                aria-controls={tabMode === 'city' ? 'modeCity' : 'modeCountry'}
                onClick={() => setMode(tabMode)}
              >
                <Icon />
                {t(label)}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mode"
          id="modeCountry"
          role="tabpanel"
          aria-labelledby="tabCountry"
          hidden={mode !== 'country'}
        >
          <div className="map-grid">
            <div className="map-card">
              <p className="map-hint">
                {t('Очих аймгуудаа газрын зураг дээр дарж сонгоорой. Хэд хэдэн аймаг зэрэг сонгож болно, дахин дарвал сонголтоос хасагдана.')}
              </p>

              {/* The outlines are static, so the map draws even while the aimags are still
                  loading — it simply has no colours or labels yet. A failure leaves the
                  shapes in place and explains itself underneath. */}
              <MongoliaMap aimags={aimagRows} />
              <MapLegend />
              {aimags.error && (
                <div style={{ marginTop: 14 }}>
                  <Notice
                    message="Газрын зургийн мэдээлэл ачаалахад алдаа гарлаа"
                    onRetry={aimags.reload}
                  />
                </div>
              )}
            </div>

            <InfoCard
              aimags={aimagRows}
              places={placeRows}
              placesLoading={places.loading}
              placesError={places.error}
              reloadPlaces={places.reload}
              guides={guideRows}
            />
          </div>

          <Checklist
            aimags={aimagRows}
            places={placeRows}
            placesLoading={places.loading}
            placesError={places.error}
            reloadPlaces={places.reload}
            guides={guideRows}
            guidesLoading={guides.loading}
            guidesError={guides.error}
            reloadGuides={guides.reload}
          />
        </div>

        <div
          className="mode"
          id="modeCity"
          role="tabpanel"
          aria-labelledby="tabCity"
          hidden={mode !== 'city'}
        >
          <CitySection />
        </div>
      </div>
    </section>
  );
}
