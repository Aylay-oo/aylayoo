/* Whether a guide has agreed to something.
 *
 * The fifty guides on the roster were listed by their tourism association, not signed up
 * individually. A tour attaches one of them by name to a public commitment, so before a tour
 * goes public somebody has to have recorded that this guide agreed — and the check belongs
 * here, called from the API, not in the admin screen. A UI is not a boundary: `/admin` is
 * unlinked rather than protected, and the thing that actually stops a bad write is the handler.
 *
 * Scopes are separate on purpose. Being in a directory, being sent strangers' trip requests and
 * being publicly rated are three different agreements, and treating them as one is how a
 * roster-wide "yes" to the first silently becomes a "yes" to the third.
 */

import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client';
import { guideConsent, type ConsentScope } from '../db/schema';

/** Active = recorded and not revoked. */
export async function hasConsent(
  db: Db,
  guideId: number,
  scope: ConsentScope,
): Promise<boolean> {
  const rows = await db
    .select({ id: guideConsent.id })
    .from(guideConsent)
    .where(and(
      eq(guideConsent.guideId, guideId),
      eq(guideConsent.scope, scope),
      // A revoked row stays in the table as history; only a null revokedAt counts.
      isNull(guideConsent.revokedAt),
    ))
    .limit(1);

  return rows.length > 0;
}

/** Every scope this guide currently has, for the admin screen. */
export async function activeConsentScopes(db: Db, guideId: number): Promise<ConsentScope[]> {
  const rows = await db
    .select({ scope: guideConsent.scope })
    .from(guideConsent)
    .where(and(eq(guideConsent.guideId, guideId), isNull(guideConsent.revokedAt)));

  return [...new Set(rows.map((r) => r.scope))];
}

/* The message a refused publish returns.
 *
 * Phrased for the person reading it in /admin, and it names the scope, because "consent
 * missing" without saying which one sends somebody hunting. */
export const consentRequiredMessage = (scope: ConsentScope) =>
  `This guide has no recorded "${scope}" consent. Record it before publishing.`;
