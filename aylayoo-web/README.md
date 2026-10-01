# aylayoo-web — the front end

Next.js (App Router) + TypeScript, built from the final design at
`apps/aylayoo/design/aylayoo_3.html` and fed by [aylayoo-service](../aylayoo-service/README.md).
Deploys to **Cloudflare Workers** via OpenNext, the same way `goal-tracker-web` does.

> **Live:** https://aylayoo-web.sbolorsaikhan4.workers.dev · admin at `/admin`

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

The photos are JPEG rather than WebP: `sips` on macOS reads WebP but cannot write it, and
adding an encoder would mean a new root dependency. `next/image` re-encodes on delivery, so
the browser gets WebP anyway.

## Environment

`NEXT_PUBLIC_API_URL` — the only variable. Copy `.env.example` to `.env.local` for local work.

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

- **CORS.** The API only answers browsers from an origin in its allow-list. The deployed
  address `https://aylayoo-web.sbolorsaikhan4.workers.dev` is already in
  `aylayoo-service/wrangler.jsonc`, but that list only takes effect when **the service** is
  redeployed. A new front-end domain means editing that file and running
  `bunx nx run aylayoo-service:deploy`.
- **Images are unoptimized.** Next's optimiser needs `sharp`, which cannot run in the Workers
  runtime, and `/cdn-cgi/image` is not available on a `workers.dev` subdomain. So `next/image`
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

## /admin

A review screen at `/admin`, deliberately **not linked from the public site** and marked
`noindex`. Sign in with the admin account from
[aylayoo-service step 7](../aylayoo-service/README.md), then:

- **Хүлээгдэж байгаа бүртгэл** — pending registrations with Approve / Reject, showing each
  applicant's photo, type, provinces, languages, phone and email.
- **Мессежүүд** — contact and booking messages, newest first.

The token lives in `sessionStorage`: it dies with the tab, rather than leaving an 8-hour
credential on a shared machine. A 401 signs out instead of showing an error, because an
expired token cannot be recovered by retrying.

Being unlinked is not the security boundary — the API is. Every call carries a bearer token
that `aylayoo-service` rejects without.

For local testing there is already an admin in the **local** D1:
`admin@local.test` / `local-dev-only-password`. It exists only in `.wrangler/` state on this
machine and is not in any seed file or migration.

## Tests

`nx run aylayoo-web:test`. Specs sit next to the code they cover. Three are worth knowing about:

- `src/lib/i18n-coverage.spec.ts` scans the component sources for every string handed to the
  translator and fails if any Mongolian survives untranslated, naming the file. Checking this
  by hand did not hold.
- `src/app/components/accessibility.spec.ts` asserts the whole-page invariants: every control
  has an accessible name, every image an alt, every toggle a reported state.
- `src/app/admin/page.spec.tsx` covers the only screen that can change what the public site
  shows.

jsdom lacks `matchMedia`, `ResizeObserver`, `PointerEvent` coordinates and `HTMLDialogElement`
methods; `jest-setup.ts` fills the first two and the specs stub the rest where needed.
