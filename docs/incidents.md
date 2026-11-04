# Incidents

Two production incidents, both found and fixed on 2026-11-02. They are written down because
between them they explain a dozen commits, three config pins and the service's logging setup,
and because the second one is the kind of mistake that is easy to make again.

All times are UTC with Ulaanbaatar (+08) in brackets. No guide's name, phone number or email
address appears in this file, or anywhere else in this repository.

---

## 1. The live site pointed at `localhost:4003`

**Impact.** Every API-backed section of https://aylayoo.com rendered empty: the map reported an
error, aimag names fell back to raw ISO codes, the guides carousel and the team section were
blank, and `/admin` could not sign in. Server-rendered pages — `/aimags/[slug]`,
`/places/[id]`, `/guides/[id]` — kept working, because those read through the `API` service
binding rather than the browser.

**Window.** The bad version went live 2026-11-02 03:14:25Z (11:14 +08) and was replaced
2026-11-02 10:14:11Z (18:14 +08) — about **7 hours**. Earlier deploys may also have been
affected; see "What we could not determine".

**Cause.** `NEXT_PUBLIC_API_URL` is inlined into the client bundle by `next build`. Both deploy
paths set it as `${NEXT_PUBLIC_API_URL:-https://aylayoo-service…workers.dev}` — a shell default
that only applies when the variable is unset. It was not unset: **Nx and Bun both load `.env`
files into the environment of the command they spawn**, and the build machine had an
`apps/aylayoo/aylayoo-web/.env.local` containing `NEXT_PUBLIC_API_URL=http://localhost:4003`.
So the default never fired and the bundle shipped with the local URL compiled in.

The web README had a line asserting that "an explicit variable on the build command outranks
both". That is true of Next's own precedence, and it was the wrong thing to check: nothing ever
reached the shell as unset.

**Fix.**

| commit | what |
|---|---|
| `2bf0bd3` | the Nx `deploy` target pins the URL unconditionally |
| `f06f113` | `cf:deploy` in `package.json` does too — the standalone Aylay-oo path had the same hole |
| — | the local file is now `.env.development.local`, which Next reads only when `NODE_ENV=development`; `.gitignore` covers `.env*.local` |

`preview` deliberately keeps the overridable form: pointing a preview at a local API is what it
is for.

**Also found.** `@opennextjs/cloudflare` does not read the build command's variable at all. Its
`extractProjectEnvVars` parses the `.env` files directly to build
`.open-next/cloudflare/next-env.mjs`, including `.env.local` in every mode except `test`. So
pinning the commands did not clean that file — only renaming the local one did. In practice
nothing reads it for this variable, because `NEXT_PUBLIC_*` is inlined as a literal and
`process.env.NEXT_PUBLIC_API_URL` appears in zero built files, but it should not carry a
localhost URL into a production artefact.

**Lesson.** A production deploy must not depend on which `.env` files happen to exist on the
machine it runs from. Prefer a pinned value over a defaulted one, and verify the built artefact
rather than the build command:

```bash
grep -rl "localhost:4003" .next/static .open-next/assets   # must be empty
```

---

## 2. Guides' phone numbers and email addresses were public

**Impact.** `GET /api/guides` and `GET /api/guides/:id` returned a `phone` and an `email` for
every approved guide — 50 real people from the Mongolian tourism association's roster. The
website never rendered either field; they were in the JSON, retrievable by anyone who asked for
it.

**Window.** From the service's first deploy, 2026-09-24 13:26:42Z (21:26 +08), until the fix
went live 2026-11-02 11:16:51Z (19:16 +08). The roster itself was imported 2026-10-02 01:12:23Z
(09:12 +08), so the real contact details were exposed for roughly **31 days**. Before that
import the endpoint exposed the same fields for the ten demo guides, whose details are
invented.

**Cause.** `src/routes/guides.ts` built its public column list subtractively:

```ts
// Everything except "status" is safe to show publicly.
const { status: _status, ...publicColumns } = getTableColumns(guides);
```

The comment was the bug. `phone` and `email` are columns on the table, so they were published
by default, and the only thing standing between the database and the internet was remembering
to omit them. Nobody did. The shape is also backwards for review: adding a column to the table
publishes it, and whoever reviews that migration is not looking at this file.

**Fix.** `1d73a6b` replaces it with an explicit allow-list of 18 fields. A new column is now
private until somebody adds it deliberately. Admin routes are untouched — `/api/admin/guides`
still selects the full row, which is how the team contacts a guide. The web `Guide` type claimed
both fields as required, which is how a public page could have started rendering them; they moved
to `AdminGuide`.

`src/routes/guides.spec.ts` pins the public shape with invented data: the list, the detail route
and a filtered query carry neither the fields nor the values, the admin route still carries both,
and the public shape still has everything the guide cards render. Verified by restoring the old
subtractive list — three tests go red.

**Lesson.** Allow-list what leaves, never deny-list it. The failure mode of a deny-list is
silent, and it fails open.

---

## What we could not determine

**Whether anyone fetched the exposed data.** No request logs existed for the period. The service
had no `observability`, no `logpush`, no `tail_consumers` and no Analytics Engine binding;
`wrangler tail` is live-only and shows nothing historical; Cloudflare Web Analytics covers page
views on `aylayoo.com`, not API requests, and carries no per-request path, IP or user-agent.

There is therefore no evidence either way — we cannot show the endpoint was scraped and we
cannot show it was not. **Treat the 50 guides' contact details as having been publicly
retrievable for that month.**

**Which earlier web deploys shipped the localhost bundle.** Cloudflare retains version metadata
but not historical asset bundles, so earlier versions cannot be inspected. `.env.local` on the
build machine was dated 2026-09-27, and both deploy paths were affected from then, so every web
deploy after that date is suspect. That is inference, not evidence.

**What changed because of this.** `observability` is now enabled on the service
(`wrangler.jsonc`), so the same question will be answerable next time. What it retains is
constrained on purpose — see `src/lib/logging.ts`: paths without query strings, errors reduced to
a type and a redacted message, no KV keys (they embed the client IP), no bodies, no headers, no
tokens. The point is to be able to investigate an incident without the logs becoming a second
copy of the data.
