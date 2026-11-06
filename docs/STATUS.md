# Where aylayoo stands

Last updated 2026-11-06. Read this first, then the READMEs. This repo is **public** — never add
passwords, tokens, hashes, real guest or guide data, or anything from `private/` or `backups/`.

## The phases

| phase | what it covers | status |
|---|---|---|
| **1** | The public site: home, aimags, places, guides, detail pages, SEO, sitemap | **Live** on https://aylayoo.com |
| **2** | The Ulaanbaatar city section (`/ulaanbaatar`) — itineraries, walking routes, food, practical guide, phrasebook, events — all editable from `/admin` | **Live.** Food and events ship deliberately **empty**; the rest is drafted, unpublished |
| **3** | Guide-led tours, trip requests, verified reviews, saved plans | **In progress.** R1a is built and tested, **not deployed** |

## Right now

- Branch **`feat/aylayoo-phase3`**, branched from
  `feat/aylayoo-phase2` (`922b65a`) — which is what is **live**. Latest commit: this one.
- **Nothing in Phase 3 is deployed.** Waiting: tours and consent (`0cc3cd2`), the review floor
  (`a0a9200`), trip requests (`9e40fca`), the web UI (`e178edb`), the deploy plan (`1390c1e`),
  and the pre-deploy fixes below.
- Migrations **`0004`** and **`0005`** are applied locally and **pending on production**. The
  fixes below add **no migration** — the retention passes only touch columns `0005` creates.
- 146 service tests, 662 web tests, typecheck and lint all green.

### Fixed before deploying, after a pre-deploy review

- **Retention is implemented, not promised.** `aylayoo-service/src/lib/retention.ts` clears
  contact details 90 days after the later of the last trip day and the closure (with creation as
  a floor), deletes whole requests at 24 months, and stamps `contact_cleared_at`. A daily **Cron
  Trigger** (03:17 UTC) runs it from the `scheduled` handler in `src/index.ts`. Previously the
  privacy notice promised both dates and nothing enforced either: the "cleanup pass" the schema
  referred to did not exist, and the procedure the docs pointed at was not in the README.
  **No review token is required while reviews do not exist** — read the other way, the rule
  would have blocked every clearing forever. Owner for the manual fallback: **S. Bolorsaikhan**,
  in `aylayoo-service/README.md`.
- **The privacy notice now says the same thing in both languages**, and matches the code term
  for term. The two sides had drifted: one named a single date, the other "whichever is later".
  The deletion line names both halves erasure actually needs — the reference *and* the contact
  used — and the address to send them to.
- **Revoking consent is atomic.** The revocation and the unpublishing of that guide's tours are
  one D1 batch. As two statements, a failure in between left consent revoked with the tours
  still public, and a retry answered 404 because the handler only matches un-revoked rows.
- **Two gaps in the tests closed:** the per-guide daily cap (20 requests/day) had none, and the
  test harness's `batch()` claimed to be atomic while running its statements outside the
  transaction it opened.
- Corrected a comment in `aylayoo-web/src/lib/api-server.ts` claiming the public tours query
  filters on consent. It does not, and it does not need to — consent is enforced on the way in.

### Still open

- All 50 production guides have **no aimag assigned**, so a tour's guide cannot be filtered by
  region.
- `invocation_logs: false` is unconfirmed in the Cloudflare dashboard.
- Email and SMS are unresolved, and R2 cannot be estimated until they are — see the plan's §11.

## The next single task

**Deploy R1a**, following [`deploy-r1a.md`](./deploy-r1a.md) step by step. **You run every
production command yourself** — the assistant does not deploy, use `--remote`, or read
production.

R1a is the first of four stages. **Not in scope until it is live:** saved plans (R1b), the
guide portal (R2), reviews (R3), email or SMS. Never in scope: the SAT and goal-tracker apps
elsewhere in this monorepo.

## Tours are not in the CRUD factory

`registerCityCrud` serves the six Phase 2 city resources. Guide-led tours have their own
handlers in `routes/admin-tours.ts`, because a tour names a real person and makes a commitment
on their behalf: its create *and* update paths must refuse a publish without the guide's active
`tours` consent, which the generic factory knows nothing about. Bolting the check on after the
factory would have left it on the easy path and absent from the one somebody adds next. The plan
originally said tours would reuse the factory; the code is right and the plan has been corrected.

## Deploy order for R1a: **web first, then service**

Not the usual order. The new API omits `rating` and `reviewCount` for guides below three
published reviews, and every production guide is below it. The live web tests `rating !== null`
— true for a missing key — so it would call `.toFixed()` on undefined. There are **two** such
sites on the deployed branch, `GuideCard.tsx` and `InfoCard.tsx`, so the crash would reach the
home page's guide section, every aimag page and every `/guides/:id`. Both are fixed. The web fix
(`!= null`) works against both API versions, so it goes first. Decide the order every release by
asking: **does either side tolerate the other being older?**

## Versions and rollback

The live version ids are **not recorded here**: reading them is a production read, which the
assistant does not do. Get them with `bunx wrangler deployments list` in each app and write
them into the deploy plan *before* deploying.

**The service must never be rolled back to `a9250cb4` or `c5a88a88`, and never past
`f8fe1632-34a3-4e08-bca0-454d2c9312a3`.** Everything older serves guides' phone numbers and
emails publicly — incident 2, live about a month. Prove it after any rollback:
`curl -s "$API/api/guides?limit=50" | grep -c '"phone"'` must be 0. The database never rolls
back; migrations are additive.

## Standing rules

- **Ask before any `--remote` command or any deploy.** The owner runs them.
- **Never run `seed/seed.sql` against `--remote`** — it starts by deleting every row.
- **Only touch `apps/aylayoo`.** Leave the SAT and goal-tracker changes alone.
- **Stage only the files you changed, by name**, and run `git status` before every commit.
- **Public responses use an explicit allow-list**, never a deny-list: a new column is private
  until somebody adds it deliberately. The lesson of incident 2.
- **Never commit private guide data**, generated SQL, or anything under `private/` or
  `backups/` (both gitignored); never print personal data in output.
- One migration per release. Read the generated SQL before applying; never edit an applied one.
- Capability tokens are stored **hashed** and travel in an `Authorization` header, never a URL
  path or query; share links use a URL fragment.
- Invent no content — no unchecked restaurants, prices, hours or events. Brand stays
  "Аялъя өө" / "aylayoo".

## From the Phase 3 plan (kept outside this repo)

The plan lives at `~/.claude/plans/breezy-knitting-dewdrop.md`. What matters from it:

- **Consent gates everything.** The 50 roster guides were listed by their association, not
  signed up individually. No `tours` consent, no publishing; no `requests` consent, no routing;
  revoking `tours` unpublishes their tours. It carries a source, an admin and an evidence note,
  and revoking sets `revoked_at` rather than deleting history.
- **Ratings are withheld below three published reviews**, keys omitted rather than nulled.
  Never backfill `guides.rating`; R3's reviews are its only legitimate source.
- **Traveller contact reaches a guide only after they accept**, enforced by the API withholding
  the fields rather than by trusting a screen to hide them.
- **Retention:** contact cleared 90 days after the later of the trip dates and closure (floor:
  creation), never before a *required* review token is delivered — **and none is required until
  R3**, because nothing delivers one before then. Requests deleted at 24 months; saved plans at
  12 months unviewed. **Automated** by a daily Cron Trigger as of R1a, with an owned manual
  fallback in `aylayoo-service/README.md`.
- **Erasure is not self-service:** reference *and* the contact used, both confirmed by an
  admin, then deleted. The lookup never says which half was wrong.
- **"Verified" means "verified request"**, never "verified purchase" — nothing is paid for here.
- **Before R2, research email and SMS from official sources and write the findings into `docs/`
  with dates.** Do not assume MailChannels; its free Workers integration was withdrawn.
- Still open from Phase 2: all 50 guides have **no aimag assigned**, so a tour's guide cannot be
  filtered by region; and `invocation_logs: false` is unconfirmed in the Cloudflare dashboard.

## Also read

- [`incidents.md`](./incidents.md) — two production incidents, their causes, and what could not
  be determined. The allow-list rule and the web-first order both come from here.
- [`deploy-r1a.md`](./deploy-r1a.md) — the next deploy, step by step.
- `aylayoo-service/README.md` — bindings, migrations, seeds, the manual retention task.
- `aylayoo-web/README.md` — build, preview, and why `NEXT_PUBLIC_API_URL` is pinned in the
  deploy target rather than defaulted (it once shipped a bundle pointing at localhost).
