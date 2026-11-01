import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getGuide, imageUrl, type Guide } from '../../../lib/api';
import { TYPE_LABEL } from '../../../lib/static-data';
import { DEFAULT_OG_IMAGE, detailMetadata, notFoundMetadata, routeId } from '../../../lib/seo';
import { GuideDetail } from './GuideDetail';
import { toGuideView } from './guide-view';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/* The API hard-filters this to status = 'approved', so a pending or rejected guide 404s there and
 * therefore 404s here. That is deliberate: someone awaiting review has no public page, and a
 * guide who is later rejected stops having one. */
const loadGuide = cache(async (raw: string): Promise<Guide | null> => {
  const id = routeId(raw);
  return id === null ? null : getGuide(id);
});

/* The 50 guides imported from the tourism association's roster have no bio — the roster does not
 * carry one — so most of these fall through to the composed sentence. */
function blurb(guide: Guide): string {
  if (guide.bioMn) return guide.bioMn;
  const where = guide.aimags.map((a) => a.nameMn).join(', ');
  const role = TYPE_LABEL[guide.type];
  return where
    ? `${guide.name} — ${role}. Ажилладаг аймгууд: ${where}.`
    : `${guide.name} — ${role}. АЯЛЪЯ ӨӨ-ийн баталгаажуулсан.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await loadGuide((await params).id);
  if (!guide) return notFoundMetadata;

  return detailMetadata({
    name: guide.name,
    description: blurb(guide),
    path: `/guides/${guide.id}`,
    // An uploaded photo lives in R2 behind the API, so imageUrl() gives an absolute URL already.
    image: imageUrl(guide.photoUrl) ?? DEFAULT_OG_IMAGE,
    imageAlt: guide.name,
  });
}

export default async function Page({ params }: Props) {
  const guide = await loadGuide((await params).id);
  if (!guide) notFound();
  // Narrowed before it crosses into a client component — see GuideView in GuideDetail.tsx.
  return <GuideDetail guide={toGuideView(guide)} />;
}
