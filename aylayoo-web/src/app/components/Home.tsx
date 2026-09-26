'use client';

import { useCallback } from 'react';
import { getAimags, getGuides, getPlaces } from '../../lib/api';
import { useResource } from '../../lib/use-resource';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { MustSeeCarousel } from './MustSeeCarousel';
import { QuickLinks } from './QuickLinks';
import { WhereSection } from './WhereSection';
import { WhySection } from './WhySection';

/* Shared data is fetched here and handed down, because several sections need the same rows:
 * the aimags feed the hero's destination list, the map, the info card and the checklist, so
 * fetching them once keeps those four in agreement and costs one request instead of four.
 * Anything only one section needs is fetched by that section.
 */
export function Home() {
  const aimags = useResource(getAimags);
  // Every place in the country, once: the info card and the checklist both slice it by
  // aimag, and a per-aimag request would refetch on every map click.
  const places = useResource(useCallback(() => getPlaces(), []));
  /* Every approved guide, once. The carousel's type filter is applied in memory rather than
   * by refetching, because the recommendation scoring needs the whole set anyway and the
   * carousel would otherwise restart its animation on each filter click. Note the API caps
   * a page at 50 — enough today, and the place to add paging when it is not. */
  const guides = useResource(useCallback(async () => (await getGuides()).data, []));
  // Its own request, as the must-see carousel is the only thing that needs this slice.
  const mustSee = useResource(useCallback(() => getPlaces({ mustSee: true }), []));

  return (
    <>
      <Header />
      <main id="top">
        <Hero aimags={aimags.data ?? []} aimagsLoading={aimags.loading} />
        <QuickLinks />
        <WhereSection aimags={aimags} places={places} guides={guides} />
        <MustSeeCarousel places={mustSee} />
        <WhySection />
      </main>
      <Footer />
    </>
  );
}
