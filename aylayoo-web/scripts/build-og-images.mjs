/* Builds public/og/<key>.jpg — an Open Graph share card for every photo in public/images.
 *
 * Why this exists: the design's photos are whatever size the mockup happened to embed, and most
 * are the wrong shape for a share card. Of the 41, nine are portrait and three are under 600px
 * wide, which is below the minimum Facebook, LinkedIn and Slack will render. Handing those
 * straight to og:image gives a sideways crop or no card at all — and the worst of them
 * (khuvsgul, khongor, khuiten, yol, erdene_zuu) are the must-see places most likely to be shared.
 *
 * So each photo is cropped to Open Graph's 1200x630 proportion, 1.905:1, and written here. Pages
 * point og:image at public/og/<key>.jpg and always get a correctly shaped card.
 *
 * Two deliberate choices:
 *
 *   * Cropped at the source's own resolution, not upscaled to 1200 wide. Blowing a 960x640 photo
 *     up to 1200x630 makes it softer, throws away a fifth of its height, and in a first pass over
 *     these 41 photos took the set from 3.4 MB to 7.8 MB — all for images only a crawler fetches.
 *     A 960x504 card is already comfortably over every platform's minimum.
 *   * Upscaled only when cropping would land under MIN_WIDTH, which is the point platforms stop
 *     rendering a card. Those few are soft, and that is still better than no card.
 *
 * Centre-cropping a portrait photo loses its top and bottom. For landscape scenery that reads
 * fine; it is a worse trade where the subject sits high in the frame.
 *
 * Already run and committed. Re-run only when public/images changes:
 *   node scripts/build-og-images.mjs        (or: nx run aylayoo-web:build-og-images)
 *
 * macOS only — it shells out to sips, which ships with the OS, so this costs no dependency.
 * sharp would be portable but cannot run in the Workers runtime and is not otherwise needed
 * here (see the images.unoptimized note in next.config.js).
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'public/images';
const OUT = 'public/og';
const RATIO = 1200 / 630; // Open Graph's recommended shape, 1.905:1
const MIN_WIDTH = 600; // below this a card stops rendering on Facebook and LinkedIn
const TARGET_WIDTH = 1200; // what an upscale aims for, when one is needed at all
const QUALITY = 55; // plenty: a card renders about 500px wide in a feed

const sips = (...args) => execFileSync('sips', args, { stdio: 'pipe' }).toString();

function dimensions(file) {
  const out = sips('-g', 'pixelWidth', '-g', 'pixelHeight', file);
  const read = (key) => Number(out.match(new RegExp(`${key}: (\\d+)`))?.[1]);
  return { width: read('pixelWidth'), height: read('pixelHeight') };
}

mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((name) => name.endsWith('.jpg'));
const upscaled = [];
let sourceBytes = 0;

for (const name of files) {
  const from = join(SRC, name);
  const to = join(OUT, name);
  const { width, height } = dimensions(from);
  sourceBytes += statSync(from).size;

  copyFileSync(from, to);

  /* The widest 1.905:1 frame this photo can give up without inventing pixels: full width for a
   * portrait or near-square source, full height for one already wider than the target shape. */
  const cropWidth = width / height > RATIO ? Math.round(height * RATIO) : width;
  const cropHeight = Math.round(cropWidth / RATIO);

  if (cropWidth < MIN_WIDTH) {
    // Too small to render anywhere. Upscale first, then take the frame out of the larger image.
    sips('--resampleWidth', String(TARGET_WIDTH), to);
    sips('--cropToHeightWidth', String(Math.round(TARGET_WIDTH / RATIO)), String(TARGET_WIDTH), to);
    upscaled.push(`${name} ${width}x${height} -> ${TARGET_WIDTH}x${Math.round(TARGET_WIDTH / RATIO)}`);
  } else {
    sips('--cropToHeightWidth', String(cropHeight), String(cropWidth), to);
  }
  sips('-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), to);
}

const outBytes = readdirSync(OUT).reduce((sum, name) => sum + statSync(join(OUT, name)).size, 0);
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(`${files.length} share cards written to ${OUT}/ at ${RATIO.toFixed(3)}:1`);
console.log(`source ${mb(sourceBytes)} -> cards ${mb(outBytes)}`);
console.log(`${files.length - upscaled.length} cropped at native resolution, ${upscaled.length} upscaled:`);
for (const line of upscaled) console.log(`  ${line}`);
