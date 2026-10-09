'use client';

import { useCallback } from 'react';
import { getAimags, getGuides, getPlaces, getTeam } from '../../lib/api';
import { useResource } from '../../lib/use-resource';
import { ContactDialog } from './ContactDialog';
import { SkipLink } from './SkipLink';
import { Footer } from './Footer';
import { Header } from './Header';
import { Hero } from './Hero';
import { GuidesSection } from './GuidesSection';
import { MustSeeCarousel } from './MustSeeCarousel';
import { RegisterDialog } from './RegisterDialog';
import { TeamSection } from './TeamSection';
import { Toast } from './Toast';
import { WhereSection } from './WhereSection';
import { WhySection } from './WhySection';

/* Shared data is fetched here and handed down, because several sections need the same rows:
 * the aimags feed the map, the info card, the checklist and the registration form, so
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
  const team = useResource(getTeam);

  return (
    <>
      {/* First focusable thing on the page, so Tab from the address bar reaches it. */}
      <SkipLink />
      <Header />
      <main id="top">
        <Hero />
        <WhereSection aimags={aimags} places={places} guides={guides} />
        <MustSeeCarousel places={mustSee} />
        <WhySection />
        <GuidesSection guides={guides} />
        <TeamSection team={team} />
      </main>
      <Footer />

      {/* Rendered once at the root, because they are opened from all over the page. The
          registration form needs the aimag list for its "where do you work" picker. */}
      <ContactDialog />
      <RegisterDialog aimags={aimags.data ?? []} />
      <Toast />
    </>
  );
}
