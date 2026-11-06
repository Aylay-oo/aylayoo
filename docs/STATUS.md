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
  (`a0a9200`), trip requests (`9e40fca`), the web UI (`e178edb`), the deploy plan (`1390c1e`).
- Migrations **`0004`** and **`0005`** are applied locally and **pending on production**.
- 123 service tests, 661 web tests, typecheck and lint all green.

## The next single task

**Deploy R1a**, following [`deploy-r1a.md`](./deploy-r1a.md) step by step. **You run every
production command yourself** — the assistant does not deploy, use `--remote`, or read
production.

R1a is the first of four stages. **Not in scope until it is live:** saved plans (R1b), the
guide portal (R2), reviews (R3), email or SMS. Never in scope: the SAT and goal-tracker apps
elsewhere in this monorepo.

## Deploy order for R1a: **web first, then service**

Not the usual order. The new API omits `rating` and `reviewCount` for guides below three
published reviews, and every production guide is below it. The live web tests `rating !== null`
— true for a missing key — so it would call `.toFixed()` on undefined and crash every guide
card. The web fix (`!= null`) works against both API versions, so it goes first. Decide the
order every release by asking: **does either side tolerate the other being older?**

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
- **Retention:** contact cleared 90 days after the later of the trip dates and closure, never
  before a required review token is delivered; requests deleted at 24 months; saved plans at 12
  months unviewed. **Manual** until a Cron Trigger exists — see `aylayoo-service/README.md`.
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
