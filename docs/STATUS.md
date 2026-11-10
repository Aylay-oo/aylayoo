# Where aylayoo stands

Last updated 2026-11-10 (R1a live and reachable; R1b built on another branch, not deployed).
Read this first, then the READMEs. This repo is **public** — never add
passwords, tokens, hashes, real guest or guide data, or anything from `private/` or `backups/`.

## The phases

| phase | what it covers | status |
|---|---|---|
| **1** | The public site: home, aimags, places, guides, detail pages, SEO, sitemap | **Live** on https://aylayoo.com |
| **2** | The Ulaanbaatar city section (`/ulaanbaatar`) — itineraries, walking routes, food, practical guide, phrasebook, events — all editable from `/admin` | **Live.** Food and events ship deliberately **empty**; the rest is drafted, unpublished |
| **3** | Guide-led tours, trip requests, verified reviews, saved plans | **R1a is live** (2026-11-06, reachable since 2026-11-10). **R1b is built but NOT deployed** — on `feat/aylayoo-r1b`. R2 and R3 not started |

## Right now

- **Two branches, and only one of them is live.**
  - **`feat/aylayoo-phase3`** — branched from `feat/aylayoo-phase2` (`922b65a`). R1a shipped
    from here on 2026-11-06 and the home-page link on 2026-11-10. **This is what is live**, and
    it is what gets pushed to the team's repo. Not merged to `main`.
  - **`feat/aylayoo-r1b`** — branched from this one at `d6f1203`. Holds all of R1b (saved
    plans) and **nothing of it is deployed**. Deliberately a separate branch so the team-repo
    push cannot carry unfinished work; see the R1b section below.
  Neither is merged to `main`, and they are not to be merged into each other.
- Migrations **`0004`** and **`0005`** are **applied on production**; nothing is pending. The
  retention work needed no migration — it only touches columns `0005` already creates.
- The daily **retention Cron Trigger**: `17 3 * * *`. What is confirmed and what is not, because
  the difference matters:
  - **Confirmed at deploy time** — the `wrangler deploy` output printed `schedule: 17 3 * * *`,
    and `wrangler triggers deploy` reported the same.
  - **Confirmed read-only (2026-11-10)** — `wrangler versions view 07823b9a…` reports
    `Handlers: fetch, scheduled`, so the live Worker does carry the scheduled handler. That is
    necessary but not sufficient: a handler with no trigger never fires.
  - **NOT confirmable from the CLI** — neither `wrangler versions view` nor
    `wrangler deployments status` lists triggers, and `wrangler triggers` exposes only
    `deploy`, which is a write. **No run has been observed.** Workers Logs is retained but
    wrangler has no command to query it; `wrangler tail` is live-only.
  - **The open check is the dashboard**: **Workers & Pages → `aylayoo-service` → Settings →
    Trigger Events** should list `17 3 * * *`, and **Workers & Pages → `aylayoo-service` →
    Logs** should hold a `contacts_cleared=0 requests_deleted=0` line for each 03:17 UTC run.
    Four are due (7, 8, 9, 10 November). An empty run is the expected result — nothing is due
    to be cleared for 90 days — so what is being checked is that the line exists at all.
- 146 service tests, 670 web tests, typecheck and lint all green on this branch.
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

### R1b is built, and none of it is live

Saved plans — account-free lists of places, tours, itineraries and walking routes, shared by a
link. It is all on **`feat/aylayoo-r1b`**, with its own step-by-step in `docs/deploy-r1b.md`
**on that branch**, and nothing has been deployed: migration `0006` (`saved_plans`) is applied
to the **local** D1 only, and production has no `saved_plans` table and no `/api/plans`.

What matters from here without reading that branch:

- **Two capability tokens, no accounts.** A read-only share token travels in the URL *fragment*
  of `/plans/shared#<token>`, which a browser never transmits; a separate edit token travels
  only in an `Authorization` header. Both are stored SHA-256 hashed, so **nobody can recover a
  share link — not an admin, not the team.** Somebody who loses it has lost the plan.
- **The table holds no personal data by construction** — no name, email or phone column exists,
  items are `{kind, id}` pointers to published rows, and the one free-text field (the title) is
  refused if it is phone- or email-shaped.
- **It would deploy SERVICE FIRST**, the opposite of R1a, because it only adds endpoints: an
  old web against the new service is invisible, while a new web against the old service would
  let a visitor collect places and then fail to save them.
- 198 service tests and 721 web tests pass on that branch.

**Do not merge or cherry-pick it onto this branch**, and do not include it in a team-repo push.
That separation is the whole reason it has its own branch.

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

**Record `tours` consent for one real guide who has actually agreed, then publish their
tour** — that is what turns R1a from deployed into usable. Everything else is secondary: until
one tour is published, `/api/city/tours` returns `{"data":[]}` and the Хөтөчтэй аялал tab shows
its empty state, so no visitor can see anything R1a built.

Consent is a commitment made on somebody's behalf. **Do not record it until that guide has
actually agreed**, and write how it was obtained into the evidence note. It is recorded in
`/admin` → the consent panel, per guide, scope `tours`.

After that, the next decision is whether to deploy R1b — see `docs/deploy-r1b.md` on
`feat/aylayoo-r1b`.

**Still not in scope:** the guide portal (R2), reviews (R3), email or SMS. Never in scope: the
SAT and goal-tracker apps elsewhere in this monorepo.

### Open tasks only a person can do

None of these can be finished by reading or changing code, which is why they are listed
together rather than scattered through the sections above.

| task | why it needs a person |
|---|---|
| **Record `tours` consent for a real guide, then publish their tour** | Somebody has to ask the guide and get a yes. See the next-single-task note above. |
| **Confirm the Cron Trigger in the dashboard** | Settings → Trigger Events, and a `contacts_cleared=…` line in Logs. Not readable from the CLI — see *Right now*. |
| **Confirm `invocation_logs: false`** | Dashboard-only read, on the same Settings page. |
| **Assign aimags to the 50 roster guides** | The association's roster does not record them, so each one is a judgement about a real person's working region. `/admin` → approved guides. |
| **Check R1a on a phone** | The local preview binds to localhost, so phone width has never been seen on real hardware. |
| **Trim `backups/` weekly, and delete `pre-0004-0005.sql` from 2027-02-04** | Local files on a laptop holding every guide's contact details; no cron can reach them. Owner: S. Bolorsaikhan. |
| **Decide the §11 email/SMS provider** | R2 cannot be estimated until it is resolved, and MailChannels' free Workers integration was withdrawn. Research from official sources and write the findings into `docs/` with dates. |
| **Decide whether guide cards should send trip requests** | A promise to a guide, not a screen change — see the deferred decision above. |

### Known gap found in the post-deploy reachability audit

A trip request naming **a guide instead of a tour** is fully supported by the API
(`tripRequestSchema` takes one of the two; `routes/trips.ts` has the guide branch with its own
approval and `requests`-consent checks; service tests cover it) but **no screen ever sends one**.
`TripRequestDialog` is mounted only on the tour page; guide cards and `/guides/:id` still open
the Phase 1/2 `ContactDialog`, which posts to `/api/contact`. Consequence worth knowing:
recording `requests` consent for a guide has no user-visible effect unless that guide also has a
published tour.

**Decision: left as it is, deliberately, and deferred.** `ContactDialog` stays unchanged on
guide cards and on `/guides/:id` for now. Pointing those at `TripRequestDialog` would start
routing strangers' trip requests to individual guides, and that is a change in what the site
promises a guide rather than a change of screen — it needs `requests` consent recorded per
guide first, and somebody has to decide whether a guide with no published tour should receive
requests at all. **Whoever picks this up:** the API side already works and is tested, so this is
a front-end and consent question, not a missing feature. Do not wire it up as a tidy-up task.

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
