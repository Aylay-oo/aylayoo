import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { AimagWithPlaces, Guide } from '../../../lib/api';
import { getAimag, getGuidesForAimag } from '../../../lib/api-server';
import { photoKey } from '../../../lib/photos';
import { REGION, REGION_OF_API } from '../../../lib/static-data';
import { DEFAULT_OG_IMAGE, detailMetadata, notFoundMetadata, ogCard } from '../../../lib/seo';
import { AimagDetail } from './AimagDetail';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

/* One call gets the aimag and its places together; the guides are a second call because coverage
 * lives in its own join table. cache() keeps generateMetadata and the page to one of each. */
const loadAimag = cache((slug: string) => getAimag(slug));

const loadGuides = cache(async (slug: string): Promise<Guide[]> => {
  try {
    return (await getGuidesForAimag(slug)).data;
  } catch {
    // A guide list that will not load must not take the aimag's own page down with it.
    return [];
  }
});

export const regionName = (region: string | null) =>
  REGION[REGION_OF_API[region ?? ''] ?? 'center'].name;

/* The aimags table has descriptionMn and imageUrl columns, but no seed or import has ever filled
 * them — they are NULL for all 22 rows. So the blurb is composed from the fields that do carry
 * something rather than read from a column that will come back empty. */
function blurb(aimag: AimagWithPlaces): string {
  const parts = [`${aimag.nameMn} — ${regionName(aimag.region)}`];
  if (aimag.centerMn) parts.push(`төв нь ${aimag.centerMn}`);
  if (aimag.places.length) parts.push(`${aimag.places.length} үзэх газар`);
  return `${parts.join(', ')}.`;
}

/* The aimag has no photo of its own, so it borrows one: a must-see place first, because that is
 * the picture someone would recognise the province by, then any place, then the site default. */
function cardImage(aimag: AimagWithPlaces): string {
  const place = aimag.places.find((p) => p.isMustSee) ?? aimag.places[0];
  return place ? ogCard(photoKey(place.imageKey, place.nameMn)) : DEFAULT_OG_IMAGE;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const aimag = await loadAimag((await params).slug);
  if (!aimag) return notFoundMetadata;

  return detailMetadata({
    name: aimag.nameMn,
    description: blurb(aimag),
    path: `/aimags/${aimag.slug}`,
    image: cardImage(aimag),
    imageAlt: aimag.nameMn,
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const aimag = await loadAimag(slug);
  if (!aimag) notFound();
  return <AimagDetail aimag={aimag} guides={await loadGuides(slug)} />;
}
