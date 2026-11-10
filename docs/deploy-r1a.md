# Deploying R1a — guide-led tours and trip requests

> **EXECUTED 2026-11-06. R1a is live.** This is now a record of what was run, not a plan.
> Live versions: web `daf23ac7-c20c-4df1-9623-3baad8ef9b7a`, service
> `07823b9a-eac2-43a3-8f4c-7aa5f6dc53ba`. Retention cron registered: `17 3 * * *`.
> Results are recorded at each step; §9's rollback limits still apply and have changed meaning
> now that the service has shipped — read §9 before rolling anything back.

R1a is five commits on top of `feat/aylayoo-phase2` (`922b65a`, which is what is live) — the
four below plus the retention and privacy-notice fixes. **The fixes add no migration**: the
retention passes only read and write columns `0005` already creates, so step 2's expectation of
exactly two pending migrations is unchanged.

| commit | what |
|---|---|
| `0cc3cd2` | `city_tours` + `guide_consent`, migration `0004`, the consent gate |
| `a0a9200` | the review floor — **and the web fix that makes this release web-first** |
| `9e40fca` | `trip_requests`, migration `0005`, the relay and the erasure lookup |
| `e178edb` | the web UI: tour pages, the request form, the admin screens |
| *(this one)* | the retention cron, the atomic consent revoke, the aligned privacy notice |

---

## Why the web goes first

Normally the service ships first, because the web is the one that needs the new endpoints. Not
this time, and the reason is verifiable rather than a matter of taste:

`a0a9200` makes the API **omit** `rating` and `reviewCount` for any guide below three published
reviews. Production guides all have `review_count` NULL, so after the service deploy **every**
guide's row comes back without those two keys.

The live web was built from `feat/aylayoo-phase2`, which tests `guide.rating !== null`.
`undefined !== null` is **true**, so that branch runs and calls `undefined.toFixed(1)`.

**There are two such sites on the deployed branch, not one:**

```
$ git show feat/aylayoo-phase2:.../components/GuideCard.tsx | grep -n "rating !== null"
121:        {guide.rating !== null ? (
$ git show feat/aylayoo-phase2:.../components/InfoCard.tsx  | grep -n "rating !== null"
165:            {guide.rating !== null && (
```

So service-first would throw on every guide card on the live site: the home page's guide
section, each aimag page, every `/guides/:id`. Both are `!= null` on this branch, as are the two
new tour components. Web-first costs nothing by comparison — the new tours tab calls
`/api/city/tours`, which the old service answers 404, and the tab shows its "could not load,
retry" state. A broken new tab for a few minutes, against a crash on pages that work today.

**Both directions must be checked, and step 6 checks them**: the new web has to work against
the old API *and* the new one, because it is live against the old one for the length of the
gap between the two deploys.

---

## 1. Back up production D1

```bash
cd apps/aylayoo/aylayoo-service
bunx wrangler d1 export aylayoo-db --remote --output=backups/pre-0004-0005.sql
ls -lh backups/pre-0004-0005.sql     # must be non-empty before you go on
```

`backups/` is gitignored and this file is a complete copy of every guide's contact details.
Keep the most recent two, delete the rest, and delete all of them 90 days after this migration
has succeeded.

**Run 2026-11-06:** 91 KB, 15 tables, 205 inserts, gitignore confirmed. `city_tours` and
`trip_requests` were absent from the dump, which independently confirmed `0004`/`0005` had not
been applied. **`backups/` now holds 5 files — trim to the two most recent.**

## 2. Confirm exactly two migrations are pending

```bash
bunx wrangler d1 migrations list aylayoo-db --remote
```

**Expected output: `0004_youthful_onslaught.sql` and `0005_easy_silk_fever.sql`, and nothing
else.** If a third appears, or either of these is missing, **stop** — something is out of step
between this branch and production, and applying blind would be guessing.

Both are additive: `0004` creates `city_tours` and `guide_consent`, `0005` creates
`trip_requests` plus its unique index on `reference`. No `ALTER`, no `DROP`, nothing that
touches an existing row. That is why there is no database rollback — see §7.

**Run 2026-11-06:** exactly those two were listed, nothing else. Applied cleanly; the follow-up
list returned "No migrations to apply!" and the three new tables came back empty with the 51
existing guides untouched.

## 3. Apply them

```bash
bunx wrangler d1 migrations apply aylayoo-db --remote
bunx wrangler d1 migrations list aylayoo-db --remote     # expect "No migrations to apply"
```

If this fails part way, **stop and do not deploy either Worker.** Re-run step 2 and report what
is pending; a half-applied pair is the one state worth stopping on.

Never run `seed/seed.sql` against `--remote`. It begins by deleting every row.

## 4. Write down both rollback targets, before deploying anything

```bash
cd apps/aylayoo/aylayoo-service && bunx wrangler deployments list   # service: note the current version id
cd ../aylayoo-web            && bunx wrangler deployments list      # web: note the current version id
```

Write both down. A rollback target chosen after something has gone wrong is chosen under
pressure. See §7 for the two rules that constrain what you may roll back to.

**Recorded 2026-11-06, immediately before this deploy:**

| app | rollback target (the version live before R1a) |
|---|---|
| service `aylayoo-service` | `fe6a8ba8-dc83-4ba7-8643-466669571e0a` (2026-11-05T03:16:58Z) |
| web `aylayoo-web` | `0cf42df7-84a6-42d7-aaa8-6461e7fc1ba6` (2026-11-05T03:01:06Z) |

The service id satisfies both absolute rules: it is newer than the privacy fix
`f8fe1632-34a3-4e08-bca0-454d2c9312a3` (2026-11-02T11:16:51Z), and the two forbidden ids
`a9250cb4` (2026-11-02T03:05) and `c5a88a88` (2026-11-02T10:46) are both older than that fix.

**The web id is from `feat/aylayoo-phase2`, so it predates `a0a9200`.** Before the service
deploy it is safe. After it, rolling the web back to this id is the `rating !== null` crash this
whole ordering exists to avoid — roll the **service** back first, then the web.

## 5. Deploy the web

```bash
cd apps/aylayoo/aylayoo-web
NX_LOAD_DOT_ENV_FILES=false bunx nx run aylayoo-web:preview
```

**Not optional.** It is the only way to see what Cloudflare will actually serve, and the one
failure it catches has happened: a `.env` file on the machine put `http://localhost:4003` into a
production bundle. `NX_LOAD_DOT_ENV_FILES=false` is what stops Nx loading those files into the
build's environment — the `preview` target keeps the overridable form of the URL on purpose, so
without this a local `.env.development.local` wins.

The preview serves on `http://localhost:8787` and binds to localhost only, so it is a desktop
check, not a phone one. Confirm the page loads, the network tab shows requests going to
`aylayoo-service.sbolorsaikhan4.workers.dev` — **not** `localhost:4003` — and then check the
built bundle itself rather than trusting the tab:

```bash
grep -rl "localhost:4003" .open-next/assets/_next/static/ | head   # expect no output
```

**Run 2026-11-06:** 0 matches in the assets and 0 in `.open-next/worker.js`; 5 files carried the
live API host. One wrinkle worth recording: in the local preview a server-rendered page
(`/guides/:id`) returns **500** unless a local `aylayoo-service` is also running, because those
reads go through the `API` service binding and the binding has no target otherwise. With the
service up it was 200. That 500 is a preview artefact, not a defect.

Then:

```bash
bunx nx run aylayoo-web:deploy      # runs lint, then builds with the API URL pinned, then deploys
bunx wrangler deployments list      # confirm a NEW version id, and record it
```

The deploy target pins `NEXT_PUBLIC_API_URL` inline for the reason written in its own comment:
a `.env` file on the machine once shipped a production bundle pointing at localhost.

## 6. Check the live web against the OLD API — before the service deploy

This is the window the order creates, so it is the window to inspect.

```bash
curl -s https://aylayoo.com/ | grep -c "localhost:4003"        # expect 0
```

In a browser, on `https://aylayoo.com`:

- [ ] the home page's guide cards render, with no star rating (the old API sends `rating: null`,
      the new web reads `!= null`, so it draws nothing rather than crashing)
- [ ] an aimag page and a `/guides/:id` page both render
- [ ] `/ulaanbaatar` loads, and the new **Хөтөчтэй аялал** tab shows the retry notice rather
      than a blank panel or a stack trace — the endpoint does not exist yet
- [ ] no uncaught errors in the console on any of those pages

If a guide card is blank or the console shows a TypeError, **stop and roll the web back** to the
id from step 4; something about the rating read is wrong and the service deploy would make it
worse.

**Run 2026-11-06 — passed.** Server-side: all pages 200, zero `localhost:4003` across the page
and all 13 served chunks, no crash markers, no contact fields, 0 tour URLs in the sitemap. The
old API was still sending `rating: null` at that point, which is exactly the shape this window
tests. Confirmed in a browser by the owner: guide cards rendered with no stars, no console
TypeError, and the Хөтөчтэй аялал tab showed its retry notice.

## 7. Deploy the service

```bash
cd apps/aylayoo/aylayoo-service
bun test            # 146 tests, all passing, before you ship
bunx wrangler deploy
bunx wrangler deployments list    # confirm a NEW version id, and record it
```

**This deploy also registers the retention Cron Trigger**, and it is the only thing that does:
`triggers.crons` in `wrangler.jsonc` changes nothing until a deploy, and
`wrangler deployments list` does **not** show triggers, so a missing cron would look exactly
like a successful release. Confirm it:

```bash
bunx wrangler triggers deploy     # idempotent; re-registers the crons from wrangler.jsonc
```

Then check the Worker's **Settings → Trigger Events** in the dashboard shows `17 3 * * *`. The
first run is the next 03:17 UTC; nothing is due to be cleared for 90 days anyway, so an empty
first run logging `contacts_cleared=0 requests_deleted=0` is the expected result, not a failure.
If the cron never appears, the data still has an owner: the manual procedure in
`aylayoo-service/README.md`, owned by S. Bolorsaikhan.

**Run 2026-11-06:** 146 tests passed, deployed as `07823b9a-eac2-43a3-8f4c-7aa5f6dc53ba`. The
`wrangler deploy` output itself printed `schedule: 17 3 * * *`, so the trigger registered with
the deploy; `wrangler triggers deploy` confirmed the same (it warns that it is experimental).
Still worth confirming once in the dashboard under **Settings → Trigger Events**.

## 8. Production checks

Read-only, and none of them print personal data.

**Run 2026-11-06 — all passed.** `/api/city/tours` → `{"data":[]}`; `/api/city/tours/1` → 404.
Zero `phone` / `email` / `fullName` / `createdAt` / `rating` / `reviewCount` across all 50
guides. All four admin routes → 401. An unaddressed trip request → 400. CORS echoed
`https://aylayoo.com` and refused `https://evil.example`. Web: all pages 200, 142 sitemap URLs
with 0 tour and 0 admin entries, existing API data intact (22 aimags, 6 must-see places).
**No production records were created.**

**The chunk result from that day does not stand.** It was recorded as "zero `localhost:4003`
across 13 chunks", but the loop it came from downloaded nothing under zsh and counted an empty
stream — see incidents.md §3. It cannot be re-run, because historical asset bundles are not
retained. Treat 2026-11-06 as unverified on this one check.

**Run 2026-11-10 — chunk check re-run after the fix, and it passed for real:** 13 home-page
chunks (779,657 bytes) and 12 `/ulaanbaatar` chunks (708,668 bytes) downloaded, **0** matches
for `localhost:4003`, live API host present. Also re-confirmed that day: all six pages 200,
zero `phone` / `email` / `fullName` / `createdAt` / `rating` / `reviewCount` across 51 guides,
three admin routes → 401, `/api/city/tours` → `{"data":[]}`, 142 sitemap URLs with 0 tour and
0 admin entries.

```bash
API=https://aylayoo-service.sbolorsaikhan4.workers.dev

# The new endpoints exist and are empty — nothing is published until consent is recorded.
curl -s "$API/api/city/tours" | head -c 200          # expect {"data":[]}
curl -s "$API/api/city/tours/1"                      # expect 404

# The allow-list still holds on the endpoints that were exposed before. Expect 0 for all three.
curl -s "$API/api/guides?limit=50" | grep -c '"phone"'
curl -s "$API/api/guides?limit=50" | grep -c '"email"'
curl -s "$API/api/guides?limit=50" | grep -c '"fullName"'

# The review floor: production guides have review_count NULL, so both keys must be ABSENT.
curl -s "$API/api/guides?limit=50" | grep -c '"rating"'        # expect 0
curl -s "$API/api/guides?limit=50" | grep -c '"reviewCount"'   # expect 0

# The relay is admin-only.
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/admin/trip-requests"   # expect 401
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/admin/tours"           # expect 401
curl -s -o /dev/null -w "%{http_code}\n" "$API/api/admin/guide-consent"   # expect 401

# A trip request with no guide and no tour is refused, so the endpoint is not an open inbox.
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/api/trips/requests" \
  -H 'Content-Type: application/json' -d '{"travellerName":"x","message":"y"}'   # expect 400

# CORS still answers the real front end, and still refuses anything else.
curl -s -D- -o /dev/null "$API/api/guides?limit=1" -H 'Origin: https://aylayoo.com' \
  | grep -i '^access-control-allow-origin'        # expect: https://aylayoo.com
curl -s -D- -o /dev/null "$API/api/guides?limit=1" -H 'Origin: https://evil.example' \
  | grep -ic '^access-control-allow-origin'       # expect 0
```

And on the web app itself:

```bash
# No served chunk points at a local API. The page HTML is not enough — the URL is inlined into
# the JS, which is exactly where the localhost regression hid last time.
#
# `while IFS= read -r`, never `for u in $(...)`: zsh does not word-split an unquoted
# expansion, so the `for` form handed every URL to curl as ONE argument, downloaded nothing,
# and `grep -c` reported 0 — a check that passes by failing. The byte count is the guard, so
# assert it before believing the count. See incidents.md.
check_chunks() {
  page="$1"
  urls=$(curl -s "$page" | grep -o '/_next/static/[^"]*\.js' | sort -u)
  if [ -z "$urls" ]; then
    echo "FAIL $page: no chunk URLs in the HTML — the check did not run"
    return 1
  fi
  n=$(printf '%s\n' "$urls" | grep -c .)
  out=$(mktemp)
  printf '%s\n' "$urls" | while IFS= read -r u; do
    [ -z "$u" ] && continue
    curl -sf "https://aylayoo.com$u" >> "$out" || echo "FAIL: $u did not download" >&2
  done
  bytes=$(wc -c < "$out" | tr -d ' ')
  hits=$(grep -c "localhost:4003" "$out" || true)
  rm -f "$out"
  if [ "$bytes" -eq 0 ]; then
    echo "FAIL $page: $n URLs found but 0 bytes downloaded — the check did not run"
    return 1
  fi
  echo "$page: $n chunks, $bytes bytes, localhost:4003 hits=$hits   # expect 0"
  [ "$hits" -eq 0 ]
}

check_chunks https://aylayoo.com/            # the home page bundle
check_chunks https://aylayoo.com/ulaanbaatar # the city bundle — where the tours deep link lives

# The sitemap lists no draft or withdrawn tour. It is built from the same published-only
# endpoint, so a draft appearing here means the status filter is not holding.
curl -s https://aylayoo.com/sitemap.xml | grep -c "/ulaanbaatar/tours/"   # expect 0 until a tour is published
```

Then in a browser:

- [ ] `https://aylayoo.com/ulaanbaatar` → the tours tab now shows its empty state
      ("Одоохондоо хөтөчтэй аялал нийтлээгүй байна."), not an error
- [ ] guide cards still render everywhere, now with the keys genuinely absent
- [ ] the privacy notice on the request form reads correctly in **both** languages, and the
      deletion line names the reference, the contact used, and the team's address
- [ ] `/admin` → the two new tabs load, tours is empty, requests is empty
- [ ] `/admin` → create a draft tour for an approved guide and confirm **Нийтлэх is disabled**
      with the missing-consent reason shown. Leave it as a draft, or delete it.
- [ ] on a phone, open the tours tab and a tour page, and check nothing scrolls sideways

**Do not record consent for a real guide until that guide has actually agreed**, and put how it
was obtained in the evidence note. The consent screen is the point at which this stops being a
deployment and starts being a commitment on somebody's behalf.

**Create no test records in production.** A draft tour named "test" is a row somebody has to
remember to delete, and a test trip request is a fake person in a table whose whole design is
about handling real ones — it would also start a 24-month retention clock on invented data. The
empty states above are the check; the behaviour itself is covered by 146 service tests locally.
Everything in §8 is a read.

## 9. Rollback targets, and the one thing a rollback must never undo

**The service.** Roll back to the id recorded in step 4.

Two absolute rules, both from incident 2 in [`incidents.md`](./incidents.md):

- **Never** roll the service back to `a9250cb4` or `c5a88a88`. Both predate the guide
  allow-list and both serve guides' phone numbers and email addresses publicly.
- **Never** roll back past `f8fe1632-34a3-4e08-bca0-454d2c9312a3`, which is the first version
  containing the fix (`1d73a6b`). Anything older reopens a month-long exposure.

The step-4 id satisfies both, because it is the version live today and today's version is newer
than the fix. The rule is written down for the case where somebody reaches further back under
pressure.

**Prove it, rather than trusting the id.** After any service rollback:

```bash
curl -s "$API/api/guides?limit=50" | grep -c '"phone"'   # must be 0
curl -s "$API/api/guides?limit=50" | grep -c '"email"'   # must be 0
```

Non-zero means you have rolled back too far. Roll forward immediately — the exposure is live
again from that moment, and it is the kind that cannot be proven either way afterwards, because
there are no request logs for the original window.

**The web, and the asymmetry that matters.** Before the service deploy, the web can be rolled
back freely. **After** it, the web must **not** be rolled back past `a0a9200`: the older bundle
tests `rating !== null` against an API that now omits the key, which is the crash this whole
ordering exists to avoid. If you need to undo the web after the service has shipped, roll the
**service** back first, then the web.

**The database is never rolled back.** `0004` and `0005` only create tables. Dropping them
would destroy any trip request already received — somebody's actual enquiry — and leaving them
in place costs nothing, because the old service never looks at them. The backup from step 1 is
there for a mistake, not for an undo.

## 10. After it is live

- Record the two new version ids in `docs/STATUS.md`.
- `trip_requests` now holds personal data, and the retention passes run **daily at 03:17 UTC**
  from the Cron Trigger registered by step 7. Confirm the trigger is listed in the dashboard
  before closing this out — a release that silently shipped without it looks identical to one
  that worked, and nothing would be due for 90 days, so the gap would not surface on its own.
- **The cron does not cover `backups/`.** A `d1 export` is a local file holding every contact
  detail in the database, so it stays part of the owned weekly task in
  `aylayoo-service/README.md` (S. Bolorsaikhan): keep the two most recent, delete the rest, and
  delete `backups/pre-0004-0005.sql` 90 days from this migration.
- The first clearing is not due until 90 days after the first real request's trip dates or
  closure, so there is nothing to verify in the data today. What is verifiable today is that the
  trigger exists and the handler runs — check the Worker's **Logs** after the first 03:17 UTC
  for a line reading `contacts_cleared=0 requests_deleted=0`.
