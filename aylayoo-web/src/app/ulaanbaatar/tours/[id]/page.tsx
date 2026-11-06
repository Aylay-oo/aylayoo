import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { CityTour } from '../../../../lib/api';
import { getCityTour } from '../../../../lib/api-server';
import { detailMetadata, notFoundMetadata, ogCard, routeId } from '../../../../lib/seo';
import { TourDetail } from './TourDetail';

/* One tour's page — the same shape as the itinerary page beside it; see that file for why each
 * piece is the way it is.
 *
 * Rendered per request, because a tour is published and unpublished from /admin and, unlike an
 * itinerary, can also be withdrawn by something nobody touched on this screen: revoking the
 * guide's consent unpublishes it immediately. A cached copy of a page that has been withdrawn
 * for a consent reason is the one kind of staleness this section must not have.
 *
 * A draft 404s, because the API only serves published tours whose guide is approved. */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

const load = cache(async (raw: string): Promise<CityTour | null> => {
  const id = routeId(raw);
  return id === null ? null : getCityTour(id);
});

/* The summary, or the stops it visits. The guide's name is deliberately NOT in the
 * description: this is the text that goes into a search result and a link preview, and a
 * guide consented to being listed, not to being advertised by name in metadata. */
const blurb = (tour: CityTour) =>
  tour.summaryMn
  || `${tour.titleMn}: ${tour.stops.map((stop) => stop.placeMn).join(', ')}`
  || tour.titleMn;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await load((await params).id);
  if (!tour) return notFoundMetadata;

  return detailMetadata({
    name: tour.titleMn,
    description: blurb(tour),
    path: `/ulaanbaatar/tours/${tour.id}`,
    image: ogCard('ub_aerial'),
    imageAlt: tour.titleMn,
  });
}

export default async function Page({ params }: Props) {
  const tour = await load((await params).id);
  if (!tour) notFound();
  return <TourDetail tour={tour} />;
}
