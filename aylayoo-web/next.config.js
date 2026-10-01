//@ts-check

const { existsSync } = require('fs');
const { dirname, join } = require('path');

/**
 * The directory that owns the `node_modules` holding Next.
 *
 * In this monorepo that is the repo root, three levels up. In the Aylay-oo team's repo, where
 * this app is checked out on its own, it is this directory. Turbopack needs a root it can
 * resolve the Next package from, and Next's own guess is unreliable — on one machine here it
 * walked up past the monorepo entirely and settled on ~/Code because of a stray lockfile,
 * which would have traced the wrong files into the standalone bundle.
 */
function workspaceRoot() {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'node_modules', 'next'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return __dirname;
}

const root = workspaceRoot();

/**
 * Deliberately a plain Next config, with no `@nx/next` wrapper.
 *
 * goal-tracker-web wraps its config in withNx, but this app is also pushed to its own repo
 * (the Aylay-oo team's, via `git subtree push --prefix=apps/aylayoo`), where there is no
 * monorepo root and no Nx. Every Nx target here shells out to `bunx next …` through
 * nx:run-commands, so nothing is lost by dropping the wrapper — and `next build` then works
 * identically in both places.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /* OpenNext consumes `.next/standalone` when it is invoked with --skipNextBuild, so the
   * standalone server bundle has to be emitted here. */
  output: 'standalone',

  turbopack: { root },
  outputFileTracingRoot: root,

  images: {
    /* Next's image optimiser needs sharp, which cannot run in the Workers runtime, and
     * Cloudflare's own /cdn-cgi/image resizing is not available on a workers.dev subdomain.
     * So next/image serves the files from public/images as they are, through the Worker's
     * assets binding.
     *
     * The cost is real and worth knowing: no WebP conversion and no per-device resizing, so
     * the 41 photos ship at their original size (3.4 MB in total, the largest 342 KB). The
     * ways out, if that becomes a problem, are a Cloudflare Images loader on a custom domain
     * or a build-time WebP step — which needs an encoder this machine does not have. */
    unoptimized: true,
  },
};

module.exports = nextConfig;
