import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { CityItinerary } from '../../../../lib/api';
import { getCityItinerary } from '../../../../lib/api-server';
import { detailMetadata, notFoundMetadata, ogCard, routeId } from '../../../../lib/seo';
import { ItineraryDetail } from './ItineraryDetail';

/* One itinerary's page. The same shape as /places/[id] — see that file for why each piece is
 * the way it is; the only differences are which loader runs and what the blurb falls back to.
 *
 * Rendered per request: an itinerary edited or published in /admin should read correctly
 * straight away, and OpenNext here has no incremental cache for a revalidated copy to live in.
 * A draft 404s, because the API only serves published rows. */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

// cache() so generateMetadata and the page share one API call instead of fetching twice.
const load = cache(async (raw: string): Promise<CityItinerary | null> => {
  const id = routeId(raw);
  return id === null ? null : getCityItinerary(id);
});

/* The summary if it has one; otherwise the stops it actually visits, which is a real sentence
 * for a crawler rather than a bare title. */
const blurb = (itinerary: CityItinerary) =>
  itinerary.summaryMn
  || `${itinerary.titleMn}: ${itinerary.stops.map((stop) => stop.placeMn).join(', ')}`
  || itinerary.titleMn;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const itinerary = await load((await params).id);
  if (!itinerary) return notFoundMetadata;

  return detailMetadata({
    name: itinerary.titleMn,
    description: blurb(itinerary),
    path: `/ulaanbaatar/itineraries/${itinerary.id}`,
    image: ogCard('ub_aerial'),
    imageAlt: itinerary.titleMn,
  });
}

export default async function Page({ params }: Props) {
  const itinerary = await load((await params).id);
  if (!itinerary) notFound();
  return <ItineraryDetail itinerary={itinerary} />;
}
