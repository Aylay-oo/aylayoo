/* The design's photo lookup, ported from apps/aylayoo/design/aylayoo_3.html.
 *
 * In the mockup every photo was an inline base64 data URI in a `PHOTOS` object. Here the
 * same keys map to real files in public/images (see scripts/extract-photos.mjs), and the
 * three-step lookup below is the mockup's `photoKey()` unchanged — same patterns, same
 * pool order, same string hash — so every place, tile and card gets exactly the photo it
 * had in the design.
 */

/** Every photo extracted from the design. */
export const PHOTO_KEYS = [
  'cattle_lake', 'ovoo', 'larch_lake', 'flaming_cliffs',
  'horse_rider', 'herder_goats', 'horses', 'wrestlers',
  'ger_camp', 'valley_ger', 'amarbayasgalant', 'night_ger',
  'sheep_sunset', 'camels', 'chinggis_statue', 'sukhbaatar',
  'ub_sign', 'choijin', 'gov_square', 'night_city',
  'gov_night', 'winter_park', 'ub_aerial', 'snow_gers',
  'glacier_riders', 'camel_glacier', 'sunset_corral', 'khuvsgul',
  'tsaatan', 'khongor', 'yol', 'khorgo',
  'erdene_zuu', 'orkhon_falls', 'khuiten', 'eagle',
  'melkhii', 'hero1', 'hero2', 'hero3',
  'hero4',
] as const;

export type PhotoKey = (typeof PHOTO_KEYS)[number];

const IS_PHOTO = new Set<string>(PHOTO_KEYS);

/** Public URL of a photo. They are plain JPEGs; next/image re-encodes on delivery. */
export function photoUrl(key: PhotoKey | string): string {
  return `/images/${key}.jpg`;
}

/* A name that matches one of these gets its own specific photo, whatever its type says.
 * First match wins, so the order is the design's. */
const BY_NAME: ReadonlyArray<readonly [RegExp, PhotoKey]> = [
  [/Хөвсгөл нуур/, 'khuvsgul'],
  [/Цаатан/, 'tsaatan'],
  [/Хонгорын элс/, 'khongor'],
  [/Баянзаг/, 'flaming_cliffs'],
  [/Ёлын ам/, 'yol'],
  [/Хорго/, 'khorgo'],
  [/Тэрхийн/, 'larch_lake'],
  [/Эрдэнэ зуу/, 'erdene_zuu'],
  [/Орхоны хүрхрээ/, 'orkhon_falls'],
  [/Алтай Таван Богд|Хүйтэн/, 'khuiten'],
  [/Потанин/, 'glacier_riders'],
  [/Бүргэд/, 'eagle'],
  [/Горхи-Тэрэлж|Мэлхий/, 'melkhii'],
  [/Хустай/, 'horses'],
  [/Цонжин Болдог/, 'chinggis_statue'],
  [/Амарбаясгалант/, 'amarbayasgalant'],
  [/Зайсан/, 'ub_aerial'],
];

/* Otherwise a photo comes from the pool for that image type. */
const POOL: Record<string, readonly PhotoKey[]> = {
  lake: ['cattle_lake', 'larch_lake'],
  desert: ['flaming_cliffs', 'camels'],
  mountain: ['snow_gers', 'glacier_riders', 'camel_glacier', 'valley_ger'],
  forest: ['valley_ger'],
  temple: ['amarbayasgalant', 'choijin'],
  steppe: ['horses', 'herder_goats', 'sheep_sunset', 'sunset_corral', 'ger_camp', 'night_ger'],
  falls: ['orkhon_falls'],
  cave: ['yol', 'flaming_cliffs'],
  monument: ['ovoo', 'chinggis_statue'],
  city: ['ub_aerial', 'gov_square', 'night_city'],
  museum: ['choijin'],
  museum2: ['gov_night'],
  opera: ['gov_night'],
  food: ['night_city'],
  khuushuur: ['ub_sign'],
  cafe: ['night_city'],
  zaisan: ['ub_aerial'],
};

/**
 * Which photo to show for an image type and an optional place name.
 *
 * 1. a name the design pinned to a specific photo wins;
 * 2. an image type that is itself a photo key uses that photo;
 * 3. otherwise hash the name into the type's pool, so a given place always gets the same
 *    photo instead of a random one on each render.
 */
export function photoKey(type: string | null | undefined, name?: string | null): PhotoKey {
  if (name) {
    for (const [pattern, key] of BY_NAME) if (pattern.test(name)) return key;
  }
  if (type && IS_PHOTO.has(type)) return type as PhotoKey;
  const pool = (type && POOL[type]) || POOL.steppe;
  let h = 0;
  for (const ch of name || type || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
