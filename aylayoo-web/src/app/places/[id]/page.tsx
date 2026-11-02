import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Place } from '../../../lib/api';
import { getPlace } from '../../../lib/api-server';
import { photoKey } from '../../../lib/photos';
import { detailMetadata, notFoundMetadata, ogCard, routeId } from '../../../lib/seo';
import { PlaceDetail } from './PlaceDetail';

/* Rendered per request rather than prerendered. A place edited in /admin should read correctly
 * straight away, and OpenNext here is configured without an incremental cache, so there is
 * nowhere for a revalidated copy to persist even if this asked for one. */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/* cache() so generateMetadata and the page itself share one API call per request instead of
 * fetching the same place twice. */
const loadPlace = cache(async (raw: string): Promise<Place | null> => {
  const id = routeId(raw);
  return id === null ? null : getPlace(id);
});

/* Falls through what the row actually has: the must-see summary reads widest, the description is
 * populated for all 67 of the design's places, and the last resort still names the aimag so a
 * crawler gets a whole sentence rather than a bare place name. */
const blurb = (place: Place) =>
  place.mustSummaryMn
  || place.descriptionMn
  || `${place.nameMn}${place.aimagNameMn ? ` — ${place.aimagNameMn}` : ''}.`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = await loadPlace((await params).id);
  if (!place) return notFoundMetadata;

  return detailMetadata({
    name: place.nameMn,
    description: blurb(place),
    path: `/places/${place.id}`,
    // The same photo key its card uses, so the share image is the picture people saw.
    image: ogCard(photoKey(place.imageKey, place.nameMn)),
    imageAlt: place.nameMn,
  });
}

export default async function Page({ params }: Props) {
  const place = await loadPlace((await params).id);
  if (!place) notFound();
  return <PlaceDetail place={place} />;
}
