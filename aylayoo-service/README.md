# aylayoo-service — Backend step-by-step guide

> **Live:** https://aylayoo-service.sbolorsaikhan4.workers.dev
> Serving https://aylayoo.com (and `www`), plus the original `aylayoo-web…workers.dev` address.
> Deployed 2026-09-24. D1 `aylayoo-db` (EEUR), R2 `aylayoo-images`, KV `RATE_LIMIT` — all bound and seeded.
> Steps 4–9 below are already done for this account; they remain as a reference for rebuilding from scratch.

Cloudflare Workers + Hono + D1 (database) + R2 (images) + Drizzle + Zod.
Lives in the monorepo at `apps/aylayoo/aylayoo-service/`, port **4003**.

---

## Step 0 — Before you start

1. If Claude Code is still running the "create-it-in" task, stop it (press `Esc`, or type `/exit`) so it doesn't write files at the same time as you.
2. Make sure you're logged in to Cloudflare:
   ```bash
   bunx wrangler login
   ```

## Step 1 — Create a branch

```bash
cd ~/Code/bolor-monorepo
git checkout -b feature/aylayoo-service
```

## Step 2 — Copy the files

Copy this whole `aylayoo-service` folder into `apps/aylayoo/`, so you get:

```
apps/aylayoo/aylayoo-service/
├── wrangler.jsonc          Cloudflare config (D1 + R2 + KV + port)
├── project.json            Nx commands (serve, deploy, migrate, seed-local)
├── tsconfig.json
├── drizzle.config.ts
├── .dev.vars.example       secret template
├── .gitignore
├── seed/seed.sql           LOCAL seed: 22 aimags, 67 places, demo guides, facts, team
├── seed/prod-*.sql         reviewed production data imports
├── scripts/hash-password.ts
└── src/
    ├── index.ts            app entry: CORS + all routes
    ├── types.ts            Env bindings
    ├── db/schema.ts        all database tables
    ├── db/client.ts
    ├── lib/auth.ts         JWT + admin middleware
    ├── lib/password.ts     password hashing
    ├── lib/validators.ts   Zod schemas
    ├── lib/rate-limit.ts   per-IP rate limiting (KV)
    ├── lib/http.ts         helpers + R2 image upload
    └── routes/
        ├── aimags.ts
        ├── places.ts
        ├── guides.ts       list, detail, register
        ├── content.ts      facts, team, images
        ├── contact.ts
        └── admin.ts        login + everything admin
```

Open `project.json` of `apps/goal-tracker/goal-tracker-service` and compare with ours. If your repo uses different executors or command styles, copy their style — the command strings stay the same.

## Step 3 — Install Hono (the only new dependency)

From the monorepo root:

```bash
bun add hono
```

(wrangler, zod, drizzle-orm, drizzle-kit and @cloudflare/workers-types are already in your root package.json.)

## Step 4 — Create the database, image bucket and rate-limit store on Cloudflare

```bash
cd apps/aylayoo/aylayoo-service
bunx wrangler d1 create aylayoo-db
bunx wrangler r2 bucket create aylayoo-images
bunx wrangler kv namespace create RATE_LIMIT
```

Each command prints an id. Paste them into `wrangler.jsonc`, replacing `PASTE_YOUR_DATABASE_ID_HERE` and `PASTE_YOUR_KV_NAMESPACE_ID_HERE`.

> Local dev works with the placeholder ids still in place — they are only needed for `--remote` and `deploy`.

> R2 must be enabled once in the Cloudflare dashboard (R2 → "Enable"). It has a free tier but may ask for a card.

## Step 5 — Local secret

```bash
cp .dev.vars.example .dev.vars
```

Open `.dev.vars` and set `JWT_SECRET` to a long random string. You can generate one with:

```bash
openssl rand -base64 32
```

## Step 6 — Create the tables

```bash
bunx drizzle-kit generate                              # makes drizzle/0000_xxx.sql from schema.ts
bunx wrangler d1 migrations apply aylayoo-db --local   # creates tables in your local DB
bunx wrangler d1 execute aylayoo-db --local --file=seed/seed.sql   # fills in sample data
```

Or with Nx from the root: `bunx nx run aylayoo-service:drizzle:generate`, then `:wrangler:migrate-local`, then `:seed-local`.

Whenever you change `src/db/schema.ts` later: run `drizzle-kit generate` again, then apply migrations again. **Never edit a migration that has already been applied to production** — add a new one.

> ⚠️ When a change makes a column nullable, SQLite cannot alter it in place, so drizzle-kit
> rebuilds the whole table. It has a bug there: the generated `INSERT ... SELECT` lists the
> *newly added* columns in the `SELECT` too, and the old table has none of them
> (`no such column: …`). Trim the `SELECT` to the columns that already exist — see the
> hand-corrected comments in `drizzle/0001_great_leper_queen.sql`.

### Migration history

| File | What it does |
|---|---|
| `0000_daily_charles_xavier.sql` | the original 8 tables |
| `0002_same_impossible_man.sql` | `guides.full_name` and `guides.experience_range`. The tourism association's roster records experience as a band ("4-6 жил"), not a number, so it gets its own column rather than being forced into `experience_years` — turning a band into a number would invent a fact about a real person. A guide has one or the other, never both. |
| `0003_wakeful_hellcat.sql` | the Ulaanbaatar city section: `city_itineraries`, `city_routes`, `city_food`, `city_tips`, `phrases`, `city_events`. Pure `CREATE TABLE` — no table rebuild, so the drizzle-kit `INSERT … SELECT` bug below does not apply. Ordered stops live in a JSON column on the itinerary or route rather than a child table: the order *is* the data, so one column keeps a reorder to a single `UPDATE` and brings the whole route back with the row. |
| `0001_great_leper_queen.sql` | everything the front-end design needs: `driver` guide type support (`experience_years`, `route_mn/en`, `car`, nullable `rating`/`review_count`), aimag `iso_code`/`center_mn/en`/`area_km2`, place `image_key`/`best_months_*`/`must_title_*`/`must_summary_*` and **nullable `lat`/`lng`**, team `name_en`/`role_en`/`school_*`/`description_*`, and contact `phone`/`guide_id`/`subject`/`kind` with **nullable `email`**. Rebuilds `places` and `contact_messages`. |

### Seeds

| File | Where it may run |
|---|---|
| `seed/seed.sql` | **`--local` only.** Deletes every row first, then loads the 22 aimags, all 67 places from the design and 10 *demo* guides with mock ratings, so a fresh local database looks like the mockup. Running this against production would destroy real data. |
| `private/prod-guides-import.sql` | **Generated, never committed.** The 50 guides from the Mongolian tourism association, holding real phone numbers and email addresses — which is why `private/` is gitignored. Build it with `node scripts/build-guide-import.mjs "<path to the xlsx>"`. Idempotent: each insert is guarded on the email address. |
| `seed/prod-2026-09-26-design-import.sql` | The reviewed production import: backfills the aimags, updates the 12 existing places to the design's text, inserts the other 55, narrows must-see to the design's 6, installs the 4 real team members and deletes the pre-launch `(sample)` guides. Never deletes a place or a real guide, and every insert is guarded so a second run is a no-op. |

### The tourism association's guide roster

50 professional guides, shared with the association's approval. They are imported as
`type = 'individual'`, `status = 'approved'` — listed rather than queued, since the sharing is
already approved.

```bash
node scripts/build-guide-import.mjs "~/Downloads/mto_hotch_50 (1).xlsx"
bunx wrangler d1 execute aylayoo-db --local --file=private/prod-guides-import.sql
```

The script reads five columns — `Овог Нэр`, `Утасны дугаар`, `И-мэйл`, `Мэддэг хэл`,
`Ажилласан хугацаа` — and stops if any of their headings has moved. The sheet's
`Имэйл явуулсан`, `Хариу` and `Gmail thread ID` columns are the association's internal
correspondence notes and never reach the database.

What it does with the data:

| | |
|---|---|
| Name | `Мөнхгэрэл Амартүвшин` → `name` = `М. Амартүвшин` (the design's form), `full_name` = the whole thing |
| Languages | Mongolian names → codes; a row with `Англи, Солонгос` becomes `["en","ko"]` |
| Experience | the band as written, in `experience_range`; `experience_years` stays NULL |
| Phone | as given, 8 digits |
| Rating | NULL, like every guide — ratings are earned from real travellers |

**Left empty, because the roster does not have it:** aimags, trip types, route, bio, photo. A
guide with no aimag appears in the site's carousel but can never be recommended by the map,
which matches on province — fill those in on `/admin` → Баталгаажсан хөтчүүд.

> `seed/seed.sql` deletes every guide before inserting its ten demo ones. Re-running it on a
> local database therefore wipes the roster; re-run the import above afterwards.

Before any `--remote` migration, take a backup first:

```bash
bunx wrangler d1 export aylayoo-db --remote --output=backups/pre-0001.sql   # backups/ is gitignored
```

## Step 7 — Create your admin account

```bash
bun scripts/hash-password.ts "choose-a-strong-password"
```

Copy the printed hash, then:

```bash
bunx wrangler d1 execute aylayoo-db --local --command "INSERT INTO admins (email, password_hash) VALUES ('admin@example.com', 'PASTE_HASH_HERE')"
```

`admin@example.com` is a **placeholder** — use your own address. This repo is public, and the
real admin address is the username half of a credential, so it is not written down here. The
production account already exists and its address is unchanged; nothing in this step applies to
it.

## Step 8 — Run it and test

```bash
bunx wrangler dev          # or from root: bunx nx run aylayoo-service:serve
```

Open these in your browser:

- http://localhost:4003/ → `{"status":"ok"}`
- http://localhost:4003/api/aimags → 22 aimags
- http://localhost:4003/api/places?mustSee=true
- http://localhost:4003/api/guides?aimag=umnugovi,khuvsgul&language=en

Test admin login in a second terminal:

```bash
curl -X POST http://localhost:4003/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"choose-a-strong-password"}'
```

## Tests

```bash
bun test                               # or: bunx nx run aylayoo-service:test
bunx nx run aylayoo-service:typecheck  # checks the worker source AND the tests
```

`src/routes/city.spec.ts` covers four rules that are invisible when they break, so none of
them would show up as an error in production:

| | |
|---|---|
| A partial `PUT` changes only what it sends | Two real bugs, found by hand before the API was committed: the update schemas carried Zod defaults, and `.partial()` leaves a default in place, so `{"status":"published"}` emptied a row's stops and renaming a published row quietly unpublished it. Both reported success. |
| An empty `{}` PUT is a 400 | It parses cleanly — every field is optional — and would otherwise reach drizzle as an `UPDATE` with nothing to `SET`. |
| A draft is not public, by list **or** by id | Guessing an id must not be a way around the status filter. The draft and a row that does not exist return identical 404s, so the response cannot be used to tell them apart. |
| Nothing under `/api/admin` answers without a token | Proves the admin city router is mounted *after* `use('*', requireAdmin)`. Mounted before it, every route would be wide open and still answer 200. |

Each of the four was checked by reintroducing the bug and confirming the suite goes red:
restoring the Zod defaults fails 6 tests, dropping the empty-PUT guard fails 2, removing the
status filter from a `:id` handler fails 3, and moving the router above the auth middleware
fails 4.

### How it runs without a Worker

`src/test/d1.ts` is a `D1Database` backed by an in-memory `bun:sqlite`, built by applying the
committed migrations in `drizzle/` — so a column added to `schema.ts` without a migration fails
the tests too. It is a test double, not a D1 emulator: `batch` is a transaction rather than
D1's exact semantics, and there are no size limits or network.

Miniflare would be more faithful, but it is only here as a transitive dependency of wrangler;
making it a real one means editing the monorepo's root `package.json`. `bun:sqlite` is built
into the runtime and costs nothing. For the same reason `src/test/bun.d.ts` declares the slice
of `bun:test` and `bun:sqlite` the tests use, instead of pulling in `bun-types`.

Two tsconfigs, because the tests need `node:` and `bun:` types the Worker deliberately does not
carry: `tsconfig.json` checks `src/` minus the tests, `tsconfig.spec.json` checks everything.
The `typecheck` target runs both.

## Logging

`observability` is enabled in `wrangler.jsonc`, so Workers Logs retains what this service writes
and it is queryable in the dashboard. It was switched on after an incident that could not be
investigated because no request logs existed at all — see
[docs/incidents.md](../docs/incidents.md).

**What it retains is a privacy decision, and `src/lib/logging.ts` is where it is made.** Read
that file before adding a `console.*` call anywhere in this service. The rules:

| | |
|---|---|
| request log | the path with its **query string stripped**. hono's default logger writes the full path including the query; `logLine` strips it, so which endpoint was hit is kept and what somebody searched for is not |
| errors | `errorSummary(err)` — the type and a redacted message only. Never the object, never `.stack`, never `.cause`: on D1 those carry the failing statement **and its bound parameters**, so logging `err` could have written a guide's phone number into a retained log the moment a registration insert failed |
| rate limiter | the limiter's name and the message. Never the KV key, which embeds the client IP |
| never logged | request bodies, headers, tokens |

`redact()` is a last line of defence over anything that still reaches a log: email-shaped
strings, Mongolian phone numbers, long digit runs, bearer tokens and JWTs are replaced by
placeholders. `src/lib/logging.spec.ts` pins all of it, using invented values.

## Data retention — the Cron Trigger, and the manual fallback

**Owner: S. Bolorsaikhan.** This section is the backstop for a cron that has stopped running,
and an unowned retention task is how data outlives the period it was promised.

The privacy notice on the trip request form makes two dated promises to the traveller, in both
languages. They are the reason this exists:

| promise | what enforces it |
|---|---|
| contact details deleted **90 days** after whichever is later — the last day of the trip (`preferred_to`) or the day the request was closed (`closed_at`) | `clearExpiredContacts()` in `src/lib/retention.ts` |
| the whole request deleted after **24 months** | `deleteExpiredRequests()` in the same file |

Both run daily at **03:17 UTC** from the `scheduled` handler in `src/index.ts`, declared as
`triggers.crons` in `wrangler.jsonc`. The handler logs **counts only** — naming the rows would
write the data into a retained log at the moment we promised to delete it.

### What the rule actually is

- The 90-day clock starts at the **later** of the end of the `preferred_to` day and `closed_at`,
  with `created_at` as a floor. The floor matters: dates are optional on the form and a request
  can sit open forever, so without it a phone number would wait for the 24-month delete.
- **No review token is required while reviews do not exist.** `review_token_delivered_at` is
  null on every row in R1a because nothing generates or delivers a token until R3, so treating
  it as a precondition would stop the pass clearing anything at all and make the 90-day promise
  false for everybody. `REVIEW_TOKEN_BLOCKS_CLEARING` in `src/lib/retention.ts` is `false`, and
  it flips to `true` in the same change that starts delivering tokens — from then on a
  `completed` request waits for its token, and `declined`/`cancelled` never do.
- Both passes are **idempotent**, which is what makes the manual catch-up below safe.
- `src/lib/retention.spec.ts` pins every boundary on both sides — a second early and exactly on
  time — so an off-by-one fails here rather than in somebody's retained phone number.

### Checking the cron is actually registered

A Cron Trigger is only created by a `wrangler deploy`; editing `wrangler.jsonc` alone changes
nothing, and `wrangler deployments list` does **not** show triggers.

```bash
bunx wrangler triggers deploy          # re-registers the crons from wrangler.jsonc
```

Otherwise confirm it in the dashboard under the Worker's **Settings → Trigger Events**, and see
the run history under **Logs**. A missed day costs nothing — the next run clears the same rows.

### The manual fallback

Weekly, and whenever the cron has not run. Read-only check first, so you know what will go:

```bash
cd apps/aylayoo/aylayoo-service

# How many rows each pass WOULD touch. Counts only — this prints no personal data.
bunx wrangler d1 execute aylayoo-db --remote --command "SELECT COUNT(*) AS contacts_to_clear FROM trip_requests WHERE contact_cleared_at IS NULL AND (email IS NOT NULL OR phone IS NOT NULL) AND MAX(created_at, COALESCE(closed_at,0), COALESCE(unixepoch(preferred_to)+86400,0)) <= unixepoch() - 90*86400"
bunx wrangler d1 execute aylayoo-db --remote --command "SELECT COUNT(*) AS requests_to_delete FROM trip_requests WHERE unixepoch(datetime(created_at,'unixepoch','+24 months')) <= unixepoch()"
```

Then the two passes, in this order — clear first, so a row deleted at 24 months was counted as
cleared too:

```bash
bunx wrangler d1 execute aylayoo-db --remote --command "UPDATE trip_requests SET email = NULL, phone = NULL, contact_cleared_at = unixepoch() WHERE contact_cleared_at IS NULL AND (email IS NOT NULL OR phone IS NOT NULL) AND MAX(created_at, COALESCE(closed_at,0), COALESCE(unixepoch(preferred_to)+86400,0)) <= unixepoch() - 90*86400"
bunx wrangler d1 execute aylayoo-db --remote --command "DELETE FROM trip_requests WHERE unixepoch(datetime(created_at,'unixepoch','+24 months')) <= unixepoch()"
```

These are the same two statements the scheduled handler runs, written out so they can be run
without deploying anything. Take a `d1 export` backup first if you are running the delete by
hand for the first time — and remember `backups/` holds real contact details: keep the two most
recent, delete the rest, and delete all of them 90 days after the migration they were taken for.

**`backups/` is not covered by the cron.** It is a local file on a laptop, so it belongs to this
same owned weekly task.

## Step 9 — Deploy to Cloudflare

```bash
bunx wrangler secret put JWT_SECRET                         # paste a NEW random string (not the local one)
bunx wrangler d1 migrations apply aylayoo-db --remote
# (removed: seed.sql is local-only — see Seeds in this README)
bunx wrangler d1 execute aylayoo-db --remote --command "INSERT INTO admins (email, password_hash) VALUES ('admin@example.com', 'PASTE_HASH_HERE')"
bunx wrangler deploy
```

Wrangler prints your live URL, e.g. `https://aylayoo-service.<your-account>.workers.dev`.

⚠️ **`seed.sql` must never be run with `--remote`.** It deletes every row first, and
production now holds real data. Changes there go through a reviewed `seed/prod-*.sql` (see
[Seeds](#seeds) above), after `d1 export`. Note the asymmetry that makes this easy to get
wrong: `d1 execute` defaults to **remote**, while `r2 object` defaults to **local** — always
pass `--local` or `--remote` explicitly.

## Step 10 — Commit and open a Pull Request

```bash
git add apps/aylayoo bun.lock package.json
git status          # make sure .dev.vars is NOT listed!
git commit -m "Add aylayoo-service backend"
git push -u origin feature/aylayoo-service
```

Then open a Pull Request on GitHub so your teammates can review it.

---

# API reference (for the front end)

All responses are JSON. Lists look like `{ "data": [...] }`, errors like `{ "error": "..." }`.

### Public

| Method | URL | Notes |
|---|---|---|
| GET | `/api/aimags` | all aimags, each with `isoCode`, `centerMn/En`, `areaKm2` |
| GET | `/api/aimags/:slug` | one aimag + its `places` |
| GET | `/api/places` | query: `aimag` (one slug), `category` (nature/historical/city/cultural), `mustSee=true` |
| GET | `/api/places/:id` | one place, plus its `aimagSlug` / `aimagNameMn` / `aimagNameEn` |
| GET | `/api/guides` | query: `aimag` (comma-separated slugs, e.g. `umnugovi,khuvsgul`), `type` (company/individual/driver), `language` (mn/en/…), `tripType` (city/countryside), `page`, `limit` (max 50). Returns `pagination` too |
| GET | `/api/guides/:id` | one approved guide with its aimags |
| POST | `/api/guides/register` | multipart form: `data` = JSON string, `photo` = image (optional). Saved as **pending** |
| POST | `/api/contact` | JSON — see below |
| GET | `/api/facts` | traveler facts |
| GET | `/api/team` | team members, Mongolian + English |
| GET | `/api/images/*` | serves uploaded images (use the `photoUrl` you get back) |

### The Ulaanbaatar city section (Phase 2)

Six resources behind `/api/city`, all editable from `/admin` → **Хот**. Every one of these
returns **only `status = 'published'`** rows, ordered by `sort_order` then `id`.

| Method | URL | Notes |
|---|---|---|
| GET | `/api/city/itineraries` | query: `days` (1, 2 or 3). An out-of-range `days` is ignored rather than refused, so a stale link still shows the list |
| GET | `/api/city/itineraries/:id` | 404 for a draft as well as for a missing row — a draft has no public page, which is the point |
| GET | `/api/city/routes` | themed walking routes |
| GET | `/api/city/routes/:id` | |
| GET | `/api/city/food` | **empty until the team fills it in.** See the note below |
| GET | `/api/city/tips` | the practical guide, one flat list; the front end groups it by `topic` |
| GET | `/api/city/phrases` | |
| GET | `/api/city/events` | published and not finished yet, soonest first. **Empty until the team adds events** |

An itinerary and a route each carry their stops as a JSON array in `stops`, in order:

```json
{
  "placeMn": "Гандан хийд", "placeEn": "Gandan Monastery",
  "timeOfDay": "morning",
  "noteMn": "…", "noteEn": "…",
  "lat": 47.9212, "lng": 106.8944
}
```

`timeOfDay` is one of `morning` / `midday` / `afternoon` / `evening`; itineraries use it and
walking routes leave it `null`. `lat`/`lng` are both-or-neither (a half coordinate is a 400) and
may be `null` — the front end's route map falls back to the ordered list for a stop without
them, which is better than putting a marker where the stop is not. Coordinates are bounded to
Ulaanbaatar itself, not the country: a city stop at 45°N is a typo, and letting it through would
stretch the map's viewBox across Mongolia.

#### Food and events ship empty, on purpose

A restaurant's prices and opening hours, and whether an event is happening, are facts about
other people's businesses and plans. Making them up would put wrong information on the site
about somebody else's livelihood and send visitors across town for nothing. Both tables are
created empty, the front end has a real empty state for each, and the team adds the rows in
`/admin`.

### Admin — the city section (header `Authorization: Bearer <token>`)

`<kind>` is one of `itineraries`, `routes`, `food`, `tips`, `phrases`, `events`.

| Method | URL | Notes |
|---|---|---|
| GET | `/api/admin/city/<kind>` | **both** statuses — this is the screen where a draft is reviewed |
| POST | `/api/admin/city/<kind>` | a new row is a **draft** unless it sends `status: "published"` |
| PUT | `/api/admin/city/<kind>/:id` | every field optional; send only what changed |
| DELETE | `/api/admin/city/<kind>/:id` | |
| PATCH | `/api/admin/city/<kind>/reorder` | `{ "ids": [3, 1, 2] }` — the whole visible list, in the order it should appear. `sort_order` becomes each row's index |

Two rules these share with the rest of the admin API, both worth knowing before you add a
seventh resource in `src/routes/admin-city.ts`:

- **A PUT only touches the fields it sends.** The update schemas deliberately carry no Zod
  `.default()`, because `.partial()` leaves a default in place and would re-apply it on every
  PUT that omitted the field. The column defaults do that job instead. The comment above the
  city schemas in `src/lib/validators.ts` has the bug this prevented — publishing a row by
  sending `{"status":"published"}` used to empty its stops.
- **An empty `{}` PUT is a 400**, not a no-op: it would reach drizzle as an UPDATE with nothing
  to SET.
- **`reorder` refuses the whole request** if any id is unknown, rather than reordering the ones
  that exist — a partial reorder leaves the list in an order the admin never chose and cannot
  see is wrong.

`city_events.link` takes **http(s) only**, the same rule as `guides.website` and now the same
code: `httpUrl()` in `src/lib/validators.ts`. Zod's `.url()` accepts `javascript:alert(1)`, and
this field is rendered as a link.

### What a public guide response contains — and does not

`/api/guides` and `/api/guides/:id` return an **explicit allow-list** of 18 columns, built in
`publicColumns` at the top of `src/routes/guides.ts`:

`id`, `type`, `name`, `bioMn`, `bioEn`, `languages`, `tripTypes`, `photoUrl`, `website`,
`experienceYears`, `experienceRange`, `routeMn`, `routeEn`, `car` — plus the `aimags` array
attached afterwards, and `rating`/`reviewCount` **only above the review floor** (below).

Phase 3 removed two more: **`fullName`** (the association's full legal form of the name) and
**`createdAt`**. The front end already refused to pass `fullName` across the client boundary —
`guide-view.ts` builds a narrower `GuideView` field by field, and its spec asserts the field is
"not present at all" — so the API was publishing a legal name the UI treated as private.
Nothing consumed either outside test fixtures.

**`phone` and `email` are never returned publicly**, and neither is `status`. They are columns
on the `guides` table and they are readable on `/api/admin/guides`, which is how the team
contacts a guide; a traveller reaches one through `POST /api/contact`, which takes the guide's
id and exposes neither. The web app's `Guide` type omits both on purpose — `AdminGuide` adds
them back.

This list used to be subtractive (`getTableColumns(guides)` minus `status`), which published
both fields for about a month. See [docs/incidents.md](../docs/incidents.md). **Add a column to
this table and it stays private until somebody adds it to `publicGuideColumns` deliberately** —
`src/routes/guides.spec.ts` fails if any of them reappears.

`publicGuideColumns` is **exported**, because `routes/tours.ts` embeds a guide in a tour and
narrows this list rather than writing a second one. Two independently-maintained allow-lists is
how they drift apart, silently.

### The review floor

`rating` and `reviewCount` are **omitted from every public response** until a guide has at least
`MIN_PUBLIC_REVIEWS` (3) published reviews. Omitted, not nulled: the front end already hides the
stars while `rating` is null, so absence reaches the same path, and a test can assert on shape
rather than value. One review rendering as "5.0" claims a precision the data does not have about
somebody's livelihood.

> **This changed a shape the live front end relied on.** `GuideCard` and `InfoCard` tested
> `guide.rating !== null`, which is **true for an absent key**, so they entered the stars branch
> and called `undefined.toFixed(1)` — a TypeError that takes the guides carousel down. Both now
> use a loose `!= null`, which is correct for null *and* undefined and therefore works against
> either API version. **The web app must be at or after that fix before the service ships the
> floor.** For this release that means deploying **web first, then service** — the reverse of
> the usual order.

### Guide-led tours and inactive guides

`/api/city/tours` inner-joins `guides` on `status = 'approved'`, so a tour disappears from both
the list and the detail route the moment its guide is rejected or set back to pending, and the
`ON DELETE CASCADE` on `city_tours.guide_id` removes the tour outright when a guide is deleted.
Publishing a tour for a guide who is not approved is **refused with 409** rather than accepted
and then filtered — a row marked "published" that nobody can see reads as a broken site.

### Guide types

`individual` is a private guide, `company` a tour operator, `driver` a driver with their own
vehicle. A `driver` **must** send `car` and no one else may; the front end shows the car on a
driver's card where a guide's card shows languages.

`rating` and `reviewCount` are `null` until real travellers leave one, and the UI hides the
stars while they are. Registration cannot set them.

Register `data` example:

```json
{
  "type": "individual",
  "name": "Bat-Erdene",
  "bioMn": "…", "bioEn": "…",
  "languages": ["mn", "en"],
  "tripTypes": ["countryside"],
  "aimagIds": [21],
  "phone": "+976 99110001",
  "email": "bat@example.com",
  "website": "",
  "experienceYears": 6,
  "routeMn": "Хөвсгөл, Архангай", "routeEn": "Khövsgöl, Arkhangai",
  "car": "Land Cruiser 200"
}
```

### Contact and booking

`POST /api/contact` takes a **phone number or an email address** — either alone is fine, but
not neither (400 otherwise). The dialog is opened from a guide or from a trip, so it also
sends where it came from:

```json
{
  "name": "Sarnai",
  "phone": "+976 99112233",
  "email": "",
  "message": "Хоёр хүн, 7 сард Хөвсгөл",
  "guideId": 12,
  "subject": "Горхи-Тэрэлж",
  "kind": "booking"
}
```

`kind` is `"contact"` (writing to a guide, the default) or `"booking"` (ordering a listed
trip); `subject` is the guide or trip name the dialog was opened with; `guideId` is set only
when it was opened from a guide's card. Messages are read back at `/api/admin/messages`.

Front-end example:

```js
const form = new FormData();
form.append('data', JSON.stringify(values));
if (photoFile) form.append('photo', photoFile);
await fetch(`${API_URL}/api/guides/register`, { method: 'POST', body: form });
```

### Admin (header `Authorization: Bearer <token>`)

| Method | URL | Notes |
|---|---|---|
| POST | `/api/admin/login` | `{ email, password }` → `{ token }` (valid 8 hours) |
| GET | `/api/admin/guides?status=pending` | pending/approved/rejected |
| PATCH | `/api/admin/guides/:id/status` | `{ "status": "approved" }` |
| PATCH | `/api/admin/guides/:id` | `{ aimagIds?: number[], tripTypes?: ("city"\|"countryside")[] }` — fills in what the association's roster does not record. `aimagIds` **replaces** the guide's whole set, so the admin screen can send what its checkboxes show and an unticked aimag really goes away. Sending neither field is refused. |
| DELETE | `/api/admin/guides/:id` | |
| POST / PUT / DELETE | `/api/admin/places[/:id]` | create / update / delete places |
| POST / PUT / DELETE | `/api/admin/facts[/:id]` | |
| POST / PUT / DELETE | `/api/admin/team[/:id]` | |
| GET | `/api/admin/messages` | contact form messages |
| POST | `/api/admin/upload` | multipart `file` (+ optional `folder`) → `{ url }` |

### Rate limiting

Three write endpoints are capped **per IP address**. Everything else (all the public `GET`s) is unlimited.

| Endpoint | Limit |
|---|---|
| `POST /api/guides/register` | 3 per hour |
| `POST /api/contact` | 5 per hour |
| `POST /api/admin/login` | 10 per hour (brute-force protection) |

Going over returns **429** with a `Retry-After` header (seconds until the window resets):

```json
{ "error": "Too many requests. Please try again later." }
```

Each endpoint has its own counter, so hitting the contact limit does not block registration. Change the numbers in the `rateLimit({ ... })` call at the top of the matching route file.

The counters live in KV rather than Cloudflare's native rate-limit binding, because that binding only supports 10-second and 60-second windows — these limits need hour-long ones. Two consequences worth knowing: the read-then-write is not atomic, so simultaneous requests can slip slightly over the limit, and if KV itself is failing the request is allowed through rather than taking the API down.

### CORS

Allowed front-end addresses are in `wrangler.jsonc` → `vars.ALLOWED_ORIGINS`:

| Origin | What it is |
|---|---|
| `https://aylayoo.com` | the live site, apex domain |
| `https://www.aylayoo.com` | the live site, www. A separate entry on purpose — see below |
| `https://aylayoo-web.sbolorsaikhan4.workers.dev` | the original Cloudflare address, still live and still supported |
| `https://ayalyoo-web.vercel.app` | the earlier Vercel deployment. Note it reads **ayalyoo**, which is how that project is actually named — not a typo to fix |
| `http://localhost:3000` | the dev server — which is why aylayoo-web pins that port |
| `http://localhost:5173` | a Vite dev server, kept from the original setup |
| `http://localhost:8787` | `opennextjs-cloudflare preview`, which serves the built Worker locally but builds against the **live** API |

A browser calling from anywhere else gets no CORS header and the request fails. **Editing this
list does nothing until the service is redeployed** — `bunx nx run aylayoo-service:deploy` —
because it is a Worker var baked in at deploy time.

`www` and the apex are listed separately because an `Origin` header is matched exactly. A
redirect from one to the other does not help: by the time the browser sends an API request it
has settled on one of the two as its origin, and whichever one is missing from this list fails.

The match normalises case and a trailing slash, and nothing else — no suffix or wildcard
matching, deliberately, since `endsWith('aylayoo.com')` would also admit `evil-aylayoo.com`.

#### Symptom to recognise

A front end on an un-allowed origin still *loads* — its own Worker serves the page fine — but
every section that needs the API comes up empty, because each one catches its own failure. On
the live site that looked like: the map drew (the shapes are static) but reported
*"Газрын зургийн мэдээлэл ачаалахад алдаа гарлаа"*, aimag names fell back to their raw ISO
codes like `MN-069` (the name lookup is keyed on data that never arrived), and the guides list
was empty. `/admin` is affected the same way. The browser console shows a CORS error; the
Worker's own logs show nothing wrong, because the request was answered — the browser simply
refused to hand the response to the page.

### The front end

[aylayoo-web](../aylayoo-web/README.md) is the site this API serves. It deploys to Cloudflare
Workers too, with OpenNext. One cross-service trap worth knowing: its `NEXT_PUBLIC_API_URL` is
compiled into its client bundle at **build** time, so pointing it at a different API means
rebuilding it, not reconfiguring it.

---

# Next steps (later)

- Email notification to admins when a new guide registers
