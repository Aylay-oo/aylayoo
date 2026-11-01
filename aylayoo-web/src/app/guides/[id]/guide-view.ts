import type { Guide } from '../../../lib/api';

/* What the guide page hands its client component — exactly the fields it renders, nothing else.
 *
 * It matters that this is narrower than Guide rather than Guide itself. GuideDetail is a client
 * component, so whatever it is given gets serialised into the page's flight data and lands in the
 * HTML source, drawn or not. Passing the whole row published the guide's phone number, email and
 * full legal name on an indexable page — the exact thing keeping them behind the contact form was
 * meant to prevent. The form still works: it posts guideId, and the API holds the details.
 *
 * In its own module because GuideDetail.tsx is 'use client', and a server component cannot call
 * a function that lives on the client — only render it as a component or pass it as a prop.
 */
export type GuideView = Pick<
  Guide,
  'id' | 'type' | 'name' | 'bioMn' | 'bioEn' | 'languages' | 'photoUrl' | 'website'
  | 'experienceYears' | 'experienceRange' | 'routeMn' | 'routeEn' | 'car' | 'aimags'
>;

/** Written field by field on purpose: a spread would carry anything added to Guide later. */
export const toGuideView = (guide: Guide): GuideView => ({
  id: guide.id,
  type: guide.type,
  name: guide.name,
  bioMn: guide.bioMn,
  bioEn: guide.bioEn,
  languages: guide.languages,
  photoUrl: guide.photoUrl,
  website: guide.website,
  experienceYears: guide.experienceYears,
  experienceRange: guide.experienceRange,
  routeMn: guide.routeMn,
  routeEn: guide.routeEn,
  car: guide.car,
  aimags: guide.aimags,
});
