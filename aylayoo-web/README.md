# aylayoo-web — the front end

Next.js (App Router) + TypeScript, built from the final design at
`apps/aylayoo/design/aylayoo_3.html` and fed by [aylayoo-service](../aylayoo-service/README.md).
Deploys to **Cloudflare Workers** via OpenNext, the same way `goal-tracker-web` does.

> **Live:** https://aylayoo.com · also https://www.aylayoo.com and the original
> https://aylayoo-web.sbolorsaikhan4.workers.dev · admin at `/admin`

```bash
# 1. the API (port 4003, local D1 already seeded)
cd apps/aylayoo/aylayoo-service && bunx wrangler dev

# 2. the site (port 3000 — see the note below)
cd apps/aylayoo/aylayoo-web && bunx next dev --port 3000
```

Or with Nx from the repo root: `bunx nx run aylayoo-web:dev`.

> **Port 3000 is not a preference.** aylayoo-service only answers browsers from an origin in
> its allow-list (`wrangler.jsonc` → `vars.ALLOWED_ORIGINS`): `http://localhost:3000`,
> `http://localhost:5173` and `https://ayalyoo-web.vercel.app`. On any other port every
> request fails CORS and the page renders with all its sections empty.

| Target | What it does |
|---|---|
| `nx run aylayoo-web:dev` | dev server on :3000 |
| `nx run aylayoo-web:build` | production build |
| `nx run aylayoo-web:test` | jest |
| `nx run aylayoo-web:lint` | eslint |
| `nx run aylayoo-web:typecheck` | tsc --noEmit |
| `nx run aylayoo-web:extract-photos` | re-extracts the design's photos into `public/images` |
| `nx run aylayoo-web:preview` | builds and runs the real Worker locally on :8787 |
| `nx run aylayoo-web:deploy` | builds and deploys to Cloudflare |

## How it fits together

| | |
|---|---|
| `src/app/globals.css` | the design's stylesheet, **ported byte-for-byte**. Its six palette passes are order-dependent and the last one wins, so a colour is declared three or four times before the value that renders. Do not tidy the duplicates away or reorder the blocks. |
| `src/app/additions.css` | styles for UI the design never had: loading states, the registration form, the admin screen. Keeps globals.css pristine. |
| `src/lib/static-data.ts` | map shapes, Ulaanbaatar tiles, nearby trips, avatar colours. Drawing instructions and editorial copy, not records — everything that *is* a record comes from the API. |
| `src/lib/i18n*.ts` | the design's 397-entry dictionary, its runtime patterns, and the strings it never needed because it had no backend. |
| `src/lib/photos.ts` | the design's photo lookup, unchanged, over real files in `public/images`. |
| `src/lib/city-labels.ts` | the Ulaanbaatar section's headings and its event date formatting. Separate from the i18n dictionary because these reach `t()` as variables, which `i18n-coverage.spec.ts` cannot see — `city-labels.spec.ts` covers them instead. |

The photos are JPEG rather than WebP: `sips` on macOS reads WebP but cannot write it, and
adding an encoder would mean a new root dependency. `next/image` re-encodes on delivery, so
the browser gets WebP anyway.

## Environment

`NEXT_PUBLIC_API_URL` — the only variable. Copy `.env.example` to `.env.local` for local work.

The deploy and preview commands default it to the live API and let the shell win, so you can
retarget a build without editing any file:

```bash
NEXT_PUBLIC_API_URL=https://api.aylayoo.com bunx nx run aylayoo-web:deploy
```

It is deliberately **not** kept in `.env.production`: `.env.local` takes precedence over that
file, so anyone with a local env file would silently ship a bundle pointing at
`localhost:4003`. An explicit variable on the build command outranks both.

**It is inlined into the client bundle by `next build`**, which is the one thing to understand
about deploying this app: setting it as a Worker var or a Cloudflare secret does nothing,
because the browser code has already been compiled by then. The `deploy` and `preview` targets
therefore set it on the build command itself. If the live site loads but every section is
empty, this is the first thing to check — the bundle is probably still pointing at
`localhost:4003`.

```bash
# confirm what a built bundle actually points at
grep -rl "aylayoo-service.sbolorsaikhan4.workers.dev" .next/static/chunks/*.js
```

## Deploying to Cloudflare

```bash
bunx wrangler login                      # once
bunx nx run aylayoo-web:preview          # optional: the real Worker on :8787
bunx nx run aylayoo-web:deploy
```

Or from inside this directory, without Nx: `bun run cf:deploy`.

Each does three things in order — `next build` with the live API URL, `opennextjs-cloudflare
build --skipNextBuild`, then `deploy` (or `preview`). The Worker is named `aylayoo-web` in
`wrangler.jsonc`, and `output: 'standalone'` in `next.config.js` is what `--skipNextBuild` consumes.

Two things to know:

- **CORS.** The API only answers browsers from an origin in its allow-list. `aylayoo.com`,
  `www.aylayoo.com` and `https://aylayoo-web.sbolorsaikhan4.workers.dev` are all in
  `aylayoo-service/wrangler.jsonc`, but that list only takes effect when **the service** is
  redeployed. **A new front-end domain means editing that file and running
  `bunx nx run aylayoo-service:deploy`** — pointing a domain at this Worker in the Cloudflare
  dashboard is only half the job. Miss it and the site loads but every API-backed section is
  empty: the map reports an error, aimag names show as raw ISO codes (`MN-069`), the guides
  list is blank, and `/admin` cannot log in. Add `www` and the apex separately; an `Origin` is
  matched exactly and a redirect between them does not help.
- **Images are unoptimized.** Next's optimiser needs `sharp`, which cannot run in the Workers
  runtime, and `/cdn-cgi/image` is not available on a `workers.dev` subdomain. (Now that the
  site has a custom domain, a Cloudflare Images loader has become possible — it was not before.) So `next/image`
  serves the files from `public/images` as they are, through the Worker's assets binding. The
  41 photos total 3.4 MB, and a first visit pulls about 645 KB for the four hero slides. If
  that becomes a problem the options are a Cloudflare Images loader on a custom domain, or a
  build-time WebP step — which needs an encoder this machine does not have (`sips` reads WebP
  but cannot write it).

## Building outside the monorepo

This app is also pushed to the Aylay-oo team's repo with
`git subtree push --prefix=apps/aylayoo aylayoo main`, where there is no monorepo root. It
builds and deploys there unchanged, because nothing it needs lives above its own directory:

| | |
|---|---|
| `package.json` | its own, with every dependency declared. Inside the monorepo the root install already satisfies them. |
| `next.config.js` | a plain config — no `@nx/next` wrapper — that finds the workspace root by looking for whichever `node_modules` holds Next |
| `tsconfig.json` | self-contained; the settings `tsconfig.base.json` used to provide are inlined |
| `jest.config.cts` | no Nx preset; `next/jest` provides the transform and every import here is relative |
| `eslint.config.mjs` | self-contained, loading the Nx plugin only if it happens to be present |

```bash
# in the Aylay-oo repo
cd aylayoo-web && bun install && bun run cf:deploy
```

## /ulaanbaatar

The city section, added in Phase 2 and fed by the six `city_*` tables in
[aylayoo-service](../aylayoo-service/README.md#the-ulaanbaatar-city-section-phase-2). Linked
from the header nav and from the home page's **Хотоор аялах** card.

Six tabs, each owning its own fetch so one slow or failed endpoint empties its own panel and
nothing else: itineraries (filtered 1/2/3 days **by the API**, not in the browser), walking
routes, food, the practical guide, the phrasebook, and what is on. Only the open tab is
mounted, so arriving fires one request rather than six — and coming back to a tab refetches,
which is what you want from a page the team edits live.

Every itinerary and route also has its own page under `/ulaanbaatar/itineraries/[id]` and
`/ulaanbaatar/routes/[id]`, shaped exactly like `/places/[id]`, and both are in the sitemap.
A **draft 404s**: the API only serves published rows, so a draft has no public page even if
somebody guesses its id.

### The route map has no map library

`components/StopMap.tsx` draws a walking route as inline SVG, the same way `MongoliaMap.tsx`
draws the country. It projects the stops' coordinates into a viewBox fitted to the route's own
bounding box, and squashes longitude by `cos(latitude)` — without that a route comes out
stretched east-west and a square block looks like a wide rectangle.

Deliberately no tiles and no dependency: this app has three runtime dependencies, every page is
built to render with the API down, and a tile layer would add a third-party request per view
plus an SSR-unsafe import. The trade is that there are no streets behind the route.

The SVG is `aria-hidden` and the ordered `<StopList>` beside it is the content — which is also
what a route whose stops have no coordinates falls back to, since `StopMap` then renders
nothing at all. A stop is numbered by its position in the **whole** route, so stop 3 reads "3"
on the map even where stop 2 could not be plotted, and the caption says how many of the stops
are shown.

### Food and events are empty on purpose

A restaurant's prices and opening hours, and whether an event is really happening, are facts
about other people's businesses and plans. Both tabs ship with an empty state that says the
team is still adding them — written to be read, since for now it is what a visitor sees.

### The phrasebook ignores the language switch

It shows the Cyrillic, the Latin pronunciation and the English all at once in both languages.
Hiding the English would make it useless to the Mongolian speaker teaching a visitor to say
something; hiding the Cyrillic would leave nothing to point at. It is the one part of the site
that does not use `pick()`.

## /admin

A review screen at `/admin`, deliberately **not linked from the public site** and marked
`noindex`. Sign in with the admin account from
[aylayoo-service step 7](../aylayoo-service/README.md), then:

- **Хүлээгдэж байгаа бүртгэл** — pending registrations with Approve / Reject, showing each
  applicant's photo, type, provinces, languages, phone and email.
- **Баталгаажсан хөтчүүд** — the approved guides, each with an **Аймаг & төрөл засах** button
  for assigning provinces and trip types. This exists because the tourism association's
  roster of 50 guides records neither: a guide with no province appears in the site's
  carousel but can never be recommended by the map, which matches on province. The header
  counts how many are still unassigned.
- **Хот** — everything the Ulaanbaatar section shows: create, edit, publish/unpublish, delete
  and reorder itineraries, walking routes, places to eat, practical tips, phrases and events,
  plus the stops inside an itinerary or a route.

  The editors are **field-driven**: `admin/city/resources.ts` declares each resource's columns
  and `CityEditor` renders them. Six hand-written screens would be thirty inputs of identical
  wiring, with no way to see at a glance that `city_food.priceLevel` is bound to the right
  column. A field's `key` *is* the API column name, so a typo there is a 400 naming the field
  rather than a silent write to the wrong place.

  Two rules worth knowing before changing it. Form values are held as strings and converted
  once on save, which is what lets a number box be genuinely empty — a price level nobody has
  checked must stay `NULL`, not become `0`. And clearing an optional field sends an explicit
  `null`, because the API leaves an absent field alone; without that, emptying a summary would
  silently keep the old text. Publishing goes through `setCityStatus`, which sends only
  `{ status }` for the same reason.

- **Мессежүүд** — contact and booking messages, newest first.

Rows with nothing in them are left out rather than printed with a dash, since the roster
leaves most fields empty and the cards would otherwise be mostly blank labels.

The token lives in `sessionStorage`: it dies with the tab, rather than leaving an 8-hour
credential on a shared machine. A 401 signs out instead of showing an error, because an
expired token cannot be recovered by retrying.

Being unlinked is not the security boundary — the API is. Every call carries a bearer token
that `aylayoo-service` rejects without.

For local testing there is already an admin in the **local** D1:
`admin@local.test` / `local-dev-only-password`. It exists only in `.wrangler/` state on this
machine and is not in any seed file or migration.

## Analytics

Cloudflare Web Analytics, enabled for `aylayoo.com` through the dashboard's **automatic setup**
(Analytics & Logs → Web Analytics). Cloudflare injects the beacon at the edge after the Worker
responds, so there is nothing to do in this app and nothing to deploy — the dashboard reports
visits, page load time and Core Web Vitals already.

**There is deliberately no beacon in the code**, and no `NEXT_PUBLIC_CF_BEACON_TOKEN`. An app-side
`<script>` on top of the automatic injection would load the beacon twice and double-count every
page view. One was built and then removed for exactly that reason; if you are about to add one,
check the dashboard first — it is probably already collecting.

No cookies, no `localStorage` and no cross-site identifiers either way, so there is nothing here
that needs a consent banner.

## Tests

`nx run aylayoo-web:test`. Specs sit next to the code they cover. Three are worth knowing about:

- `src/lib/i18n-coverage.spec.ts` scans the component sources for every string handed to the
  translator and fails if any Mongolian survives untranslated, naming the file. Checking this
  by hand did not hold.
- `src/app/components/accessibility.spec.ts` asserts the whole-page invariants: every control
  has an accessible name, every image an alt, every toggle a reported state.
- `src/app/admin/page.spec.tsx` and `src/app/admin/city/CityTab.spec.tsx` cover the screens
  that can change what the public site shows.
- `src/app/components/StopMap.spec.tsx` pins the route map's geometry, including that a route
  which is square on the ground plots square on screen. The map is silent when it is wrong — a
  squashed route still looks like a plausible picture — so this is checked rather than eyeballed.
- `src/lib/city-labels.spec.ts` is the city section's equivalent of `trips.spec.ts`: the
  headings there reach `t()` as variables, so the i18n coverage scan cannot see them.

jsdom lacks `matchMedia`, `ResizeObserver`, `PointerEvent` coordinates and `HTMLDialogElement`
methods; `jest-setup.ts` fills the first two and the specs stub the rest where needed.
