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
bunx wrangler d1 execute aylayoo-db --local --command "INSERT INTO admins (email, password_hash) VALUES ('ayalyoo123@gmail.com', 'PASTE_HASH_HERE')"
```

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
  -d '{"email":"ayalyoo123@gmail.com","password":"choose-a-strong-password"}'
```

## Step 9 — Deploy to Cloudflare

```bash
bunx wrangler secret put JWT_SECRET                         # paste a NEW random string (not the local one)
bunx wrangler d1 migrations apply aylayoo-db --remote
# (removed: seed.sql is local-only — see Seeds in this README)
bunx wrangler d1 execute aylayoo-db --remote --command "INSERT INTO admins (email, password_hash) VALUES ('ayalyoo123@gmail.com', 'PASTE_HASH_HERE')"
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
