# Where aylayoo stands

Last updated 2026-11-10 (R1a live; guided tours now reachable from the home page). Read this
first, then the READMEs. This repo is **public** — never add
passwords, tokens, hashes, real guest or guide data, or anything from `private/` or `backups/`.

## The phases

| phase | what it covers | status |
|---|---|---|
| **1** | The public site: home, aimags, places, guides, detail pages, SEO, sitemap | **Live** on https://aylayoo.com |
| **2** | The Ulaanbaatar city section (`/ulaanbaatar`) — itineraries, walking routes, food, practical guide, phrasebook, events — all editable from `/admin` | **Live.** Food and events ship deliberately **empty**; the rest is drafted, unpublished |
| **3** | Guide-led tours, trip requests, verified reviews, saved plans | **R1a is live** (2026-11-06). R1b, R2 and R3 not started |

## Right now

- Branch **`feat/aylayoo-phase3`**, branched from `feat/aylayoo-phase2` (`922b65a`).
  **R1a shipped from this branch on 2026-11-06** — it is what is live. Not merged to `main`.
- Migrations **`0004`** and **`0005`** are **applied on production**; nothing is pending. The
  retention work needed no migration — it only touches columns `0005` already creates.
- The daily **retention Cron Trigger is registered**: `17 3 * * *`, confirmed twice at deploy
  time — the `wrangler deploy` output printed `schedule: 17 3 * * *`, and `wrangler triggers
  deploy` reported the same. **Not yet confirmed in the dashboard**, and there is no read-only
  way to confirm it from the CLI: `wrangler triggers` exposes only `deploy`, which is a write.
  The open check is **Settings → Trigger Events**, plus a `contacts_cleared=0
  requests_deleted=0` line in **Logs** for any 03:17 UTC run since 2026-11-07.
- 146 service tests, 670 web tests, typecheck and lint all green.
- **`0f71e82` makes guided tours reachable from the home page** — a named `Хөтөчтэй аялал` link
  in `CitySection`, and `UlaanbaatarPage` opening a tab from the URL hash. Committed
  2026-11-06, **after** that day's web deploy, so it sat on the branch unshipped for four days.
  **Deployed 2026-11-10** as `3bd57cc9`. It changed no API contract, so it shipped web-only —
  the service was already at R1a and neither side needed the other to move.

### What is live, and the version ids

| | version | deployed |
|---|---|---|
| web `aylayoo-web` | `3bd57cc9-f4f3-46d4-a0d6-c7174738e5e9` | 2026-11-10 12:02 UTC |
| service `aylayoo-service` | `07823b9a-eac2-43a3-8f4c-7aa5f6dc53ba` | 2026-11-06 12:53 UTC |

R1a itself was deployed **web first, then service** — see the ordering section below. The gap
between the two was inspected while it was open: the new web rendered guide cards against the
old API with no stars and no TypeError, which is the failure that ordering exists to prevent.
The 2026-11-10 web deploy needed no such ordering, because it touches no API contract.

**R1a has no published content yet, by design.** No guide consent is recorded and no tour is
published, so `/api/city/tours` returns `{"data":[]}` and the Хөтөчтэй аялал tab shows its empty
state. That is the consent gate working, not a fault — but it means nothing in R1a is visible to
a visitor until somebody records consent and publishes a tour.

**Reachability was the separate gap, and it is what `0f71e82` fixes.** As first deployed, the
only route to guided tours was to land on `/ulaanbaatar` and notice the second of seven tabs —
the home page never named them, which fails the home-page rule below. The click path, live as
of 2026-11-10: **`/` → the city section's `Хөтөчтэй аялал` button → `/ulaanbaatar#tours`**,
which opens the tours tab directly. An empty tab is the correct
destination today: the link must land on the tab's own "no tours published yet" message rather
than a blank panel, and an unknown hash must fall back to the default tab. Both are tested.

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
- `invocation_logs: false` is unconfirmed in the Cloudflare dashboard, as is the retention Cron
  Trigger under **Settings → Trigger Events**. Both are dashboard-only reads.
- Email and SMS are unresolved, and R2 cannot be estimated until they are — see the plan's §11.
- **`aylayoo-service/backups/` is trimmed to the two the rule allows** (2026-11-10):
  `pre-0004-0005.sql` and `pre-admin-reset.sql` kept, three older exports deleted. Each file is
  a complete copy of every guide's contact details, so the surplus was the kind of thing that
  should not sit around. The directory is gitignored and nothing in it has ever been committed.
  Keeping it trimmed is the owned weekly task in `aylayoo-service/README.md`
  (S. Bolorsaikhan); `pre-0004-0005.sql` is itself due for deletion 90 days after that
  migration, i.e. from **2027-02-04**.

## The next single task

**Record `tours` consent for one real guide who has actually agreed, and publish their
tour** — that is what turns R1a from deployed into usable. Consent is a commitment made on
somebody's behalf: do not record it until that guide has agreed, and put how it was obtained in
the evidence note.

R1a was the first of four stages. **Still not in scope:** saved plans (R1b), the guide portal
(R2), reviews (R3), email or SMS. Never in scope: the SAT and goal-tracker apps elsewhere in
this monorepo.

### Known gap found in the post-deploy reachability audit

A trip request naming **a guide instead of a tour** is fully supported by the API
(`tripRequestSchema` takes one of the two; `routes/trips.ts` has the guide branch with its own
approval and `requests`-consent checks; service tests cover it) but **no screen ever sends one**.
`TripRequestDialog` is mounted only on the tour page; guide cards and `/guides/:id` still open
the Phase 1/2 `ContactDialog`, which posts to `/api/contact`. Consequence worth knowing:
recording `requests` consent for a guide has no user-visible effect unless that guide also has a
published tour.

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

Live ids are in the table above. The rollback targets:

| | roll back to | note |
|---|---|---|
| web | `daf23ac7-c20c-4df1-9623-3baad8ef9b7a` | undoes the 2026-11-10 home-page link only. Safe to roll back on its own: it is R1a-era, so it reads `rating` as `!= null` |
| service | `fe6a8ba8-dc83-4ba7-8643-466669571e0a` | the pre-R1a service — undoes all of R1a |

**Do not reach past `daf23ac7` for the web.** `0cf42df7` and `388cf3b0` are the pre-R1a web
builds and are no longer valid targets on their own; see the constraint below.

**The service must never be rolled back to `a9250cb4` or `c5a88a88`, and never past
`f8fe1632-34a3-4e08-bca0-454d2c9312a3`.** Everything older serves guides' phone numbers and
emails publicly — incident 2, live about a month. Prove it after any rollback:
`curl -s "$API/api/guides?limit=50" | grep -c '"phone"'` must be 0.

**The web rollback is the constrained one.** Both `0cf42df7` and `388cf3b0` were built from
`feat/aylayoo-phase2`, which tests `rating !== null` — and the service now omits that key, so
rolling the web back **past `a0a9200`** reintroduces the `undefined.toFixed()` crash on every
guide card. `daf23ac7` is on the safe side of that line and can be rolled back to alone. To go
further back than it: **roll the service back first, then the web.**

The database never rolls back; `0004` and `0005` only create tables, and dropping them would
destroy any trip request a real person has sent.

## Standing rules

- **Every new user-facing feature must be reachable from the home page.** If a visitor who
  lands on `/` cannot get to it by following links, it does not count as shipped — a feature
  nobody can navigate to is indistinguishable from one that was never deployed, and it will not
  be found by the people it was built for. State the click path when you call a feature done.
  This covers the public site only: `/admin` is deliberately unlinked (see the consent note
  below), and an entry point still has to respect the content gates — a tour nobody has
  published is correctly invisible.
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

- [`incidents.md`](./incidents.md) — two production incidents and one near miss, their causes,
  and what could not be determined. The allow-list rule and the web-first order both come from
  here. §3 is the near miss: the §8 chunk check could not fail under zsh, so the 2026-11-06
  result for it is unverified and the 2026-11-10 one is the confirmed `0`.
- [`deploy-r1a.md`](./deploy-r1a.md) — the next deploy, step by step.
- `aylayoo-service/README.md` — bindings, migrations, seeds, the manual retention task.
- `aylayoo-web/README.md` — build, preview, and why `NEXT_PUBLIC_API_URL` is pinned in the
  deploy target rather than defaulted (it once shipped a bundle pointing at localhost).
