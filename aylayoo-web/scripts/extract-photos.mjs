// Pulls the 41 photos out of the design mockup and writes them to public/images/.
//
//   node scripts/extract-photos.mjs
//
// The mockup (apps/aylayoo/design/aylayoo_3.html) carries every photo inline as a base64
// data URI, which is what makes that one file 4.8 MB. Here they become real files that
// next/image can serve, resize and re-encode.
//
// They stay JPEG rather than becoming WebP: this Mac's `sips` reads WebP but cannot write
// it ("Can't write format: org.webmproject.webp"), and neither cwebp, ImageMagick, sharp
// nor Pillow is available — adding one would mean touching the root package.json. It costs
// nothing in the browser, because next/image converts to WebP/AVIF on the fly. Files above
// MAX_BYTES are re-encoded through sips to keep the repo small.
//
// In practice nothing gets re-encoded today: sips' numeric `formatOptions` is not a
// monotonic quality scale (measured on hero2.jpg: 45 → 251 KB, 60 → 362 KB, 78 → 497 KB
// from a 342 KB original), and the only setting that genuinely shrinks it, `low`, is too
// lossy for a full-bleed hero. So the guard below keeps a re-encode only when it is
// actually smaller, and the photos ship as the mockup's own JPEGs. The largest is 342 KB
// at 1700px, which next/image never serves as-is.
//
// Safe to re-run: it overwrites the same filenames and reports what changed.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = dirname(HERE);
const DESIGN = join(APP, '../design/aylayoo_3.html');
const OUT = join(APP, 'public/images');

// Anything bigger gets re-encoded; hero2 is the only photo that needs it.
const MAX_BYTES = 180 * 1024;
const MAX_EDGE = 1920;
const QUALITY = 78;

if (!existsSync(DESIGN)) {
  console.error(`Design file not found: ${DESIGN}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const html = readFileSync(DESIGN, 'utf8');
const block = html.match(/const PHOTOS = \{(.*?)\};\n/s);
if (!block) {
  console.error('Could not find `const PHOTOS = {...}` in the design file.');
  process.exit(1);
}

const entries = [
  ...block[1].matchAll(/"([a-z0-9_]+)":\s*"data:image\/(\w+);base64,([A-Za-z0-9+/=]+)"/g),
];
if (entries.length === 0) {
  console.error('Found the PHOTOS block but no data URIs inside it.');
  process.exit(1);
}

let written = 0;
let shrunk = 0;
let total = 0;

for (const [, key, format, base64] of entries) {
  // Every photo in the mockup is a JPEG; bail loudly rather than mislabel a file.
  if (format !== 'jpeg' && format !== 'jpg') {
    console.error(`${key}: unexpected format "${format}" — expected jpeg`);
    process.exit(1);
  }

  const file = join(OUT, `${key}.jpg`);
  writeFileSync(file, Buffer.from(base64, 'base64'));
  written += 1;

  let bytes = statSync(file).size;
  if (bytes > MAX_BYTES) {
    const tmp = `${file}.tmp.jpg`;
    // `sips -Z` scales the longest edge, keeping the aspect ratio, and only shrinks.
    execFileSync('sips', [
      '-Z', String(MAX_EDGE),
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', String(QUALITY),
      file, '--out', tmp,
    ], { stdio: 'ignore' });
    const after = statSync(tmp).size;
    if (after < bytes) {
      rmSync(file);
      writeFileSync(file, readFileSync(tmp));
      console.log(`  ${key}.jpg  ${kb(bytes)} → ${kb(after)}  (re-encoded)`);
      bytes = after;
      shrunk += 1;
    }
    rmSync(tmp, { force: true });
  }
  total += bytes;
}

function kb(n) {
  return `${(n / 1024).toFixed(0)} KB`;
}

console.log(`\n${written} photos → public/images/  (${kb(total)} total, ${shrunk} re-encoded)`);
if (written !== 41) {
  console.warn(`Expected 41 photos, wrote ${written} — check the design file.`);
}
