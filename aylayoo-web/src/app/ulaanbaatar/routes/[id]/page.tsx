import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { CityRouteItem } from '../../../../lib/api';
import { getCityRoute } from '../../../../lib/api-server';
import { detailMetadata, notFoundMetadata, ogCard, routeId } from '../../../../lib/seo';
import { RouteDetail } from './RouteDetail';

/* One walking route's page. See the itinerary page next door, and /places/[id] before that,
 * for why this shape. A draft 404s, because the API only serves published rows. */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

const load = cache(async (raw: string): Promise<CityRouteItem | null> => {
  const id = routeId(raw);
  return id === null ? null : getCityRoute(id);
});

/* A route's stops read as a route when they are joined with arrows, which is also what the
 * card shows when there is no summary. */
const blurb = (route: CityRouteItem) =>
  route.summaryMn
  || route.stops.map((stop) => stop.placeMn).join(' → ')
  || route.titleMn;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = await load((await params).id);
  if (!route) return notFoundMetadata;

  return detailMetadata({
    name: route.titleMn,
    description: blurb(route),
    path: `/ulaanbaatar/routes/${route.id}`,
    image: ogCard('ub_aerial'),
    imageAlt: route.titleMn,
  });
}

export default async function Page({ params }: Props) {
  const route = await load((await params).id);
  if (!route) notFound();
  return <RouteDetail route={route} />;
}
