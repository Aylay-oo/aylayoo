import type { AdminCityRow, CityKind } from '../../../lib/admin-api';
import {
  PHRASE_CATEGORIES, PHRASE_CATEGORY_MN, PRICE_LEVEL_MN, TIP_TOPICS, TIP_TOPIC_MN,
} from '../../../lib/city-labels';

/* What each city resource's editor looks like, as data.
 *
 * Six resources × (a form, a list row, a create, an update) is where a hand-written screen per
 * table stops being readable: thirty inputs, each repeating the same label/value/onChange
 * wiring, and a reviewer has no way to see at a glance that `city_food.priceLevel` is wired to
 * the right column. Declared as fields, the whole surface of the editor is this one file, and
 * CityEditor renders it.
 *
 * Mongolian only, like the rest of /admin — it is used by the people who run the site, so a
 * language switch there would be furniture nobody needs. i18n-coverage.spec.ts skips app/admin
 * for exactly that reason, which is why none of these strings go through t().
 *
 * A field's `key` is the API column name. The payload is built from these keys, so a typo here
 * is a 400 from the server naming the field — not a silent write to the wrong column.
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'stops';

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  /** Refused before the request is sent, so an obvious omission does not cost a round trip. */
  required?: boolean;
  options?: readonly { value: string | number; label: string }[];
  rows?: number;
  /** Shown under the input — for the few fields whose rule is not obvious from the label. */
  hint?: string;
};

export type CityResource = {
  kind: CityKind;
  /** The sub-tab's label. */
  label: string;
  /** Used in sentences: "Шинэ хөтөлбөр", "хөтөлбөр устгах уу?". */
  singular: string;
  /** What to show as a row's heading in the list. */
  titleOf: (row: AdminCityRow) => string;
  fields: readonly Field[];
};

const bilingual = (
  keyMn: string,
  keyEn: string,
  label: string,
  type: FieldType = 'text',
  required = false,
  rows?: number,
): Field[] => [
  { key: keyMn, label: `${label} (MN)`, type, required, rows },
  { key: keyEn, label: `${label} (EN)`, type, required, rows },
];

const asText = (value: unknown): string => (typeof value === 'string' ? value : '');

export const CITY_RESOURCES: readonly CityResource[] = [
  {
    kind: 'itineraries',
    label: 'Хөтөлбөр',
    singular: 'хөтөлбөр',
    titleOf: (row) => asText(row.titleMn),
    fields: [
      ...bilingual('titleMn', 'titleEn', 'Нэр', 'text', true),
      {
        key: 'days',
        label: 'Хоногийн тоо',
        type: 'select',
        required: true,
        options: [
          { value: 1, label: '1 өдөр' },
          { value: 2, label: '2 өдөр' },
          { value: 3, label: '3 өдөр' },
        ],
      },
      ...bilingual('summaryMn', 'summaryEn', 'Тайлбар', 'textarea', false, 3),
      { key: 'stops', label: 'Зогсоолууд', type: 'stops' },
    ],
  },
  {
    kind: 'routes',
    label: 'Явган маршрут',
    singular: 'маршрут',
    titleOf: (row) => asText(row.titleMn),
    fields: [
      ...bilingual('titleMn', 'titleEn', 'Нэр', 'text', true),
      ...bilingual('summaryMn', 'summaryEn', 'Тайлбар', 'textarea', false, 3),
      { key: 'stops', label: 'Зогсоолууд', type: 'stops' },
    ],
  },
  {
    kind: 'food',
    label: 'Хоол',
    singular: 'хоолны газар',
    titleOf: (row) => asText(row.nameMn),
    fields: [
      ...bilingual('nameMn', 'nameEn', 'Нэр', 'text', true),
      ...bilingual('categoryMn', 'categoryEn', 'Төрөл'),
      ...bilingual('knownForMn', 'knownForEn', 'Онцлог', 'textarea', false, 2),
      ...bilingual('areaMn', 'areaEn', 'Хаяг / дүүрэг'),
      {
        key: 'priceLevel',
        label: 'Үнийн түвшин',
        type: 'select',
        /* No option is selected by default, and an empty one is kept: the column is nullable
         * because a price nobody has checked should stay unknown rather than be guessed at. */
        hint: 'Мэдэхгүй бол хоосон орхи.',
        options: ([1, 2, 3] as const).map((level) => ({
          value: level,
          label: `${'₮'.repeat(level)} — ${PRICE_LEVEL_MN[level]}`,
        })),
      },
    ],
  },
  {
    kind: 'tips',
    label: 'Хэрэгтэй мэдээлэл',
    singular: 'мэдээлэл',
    titleOf: (row) => asText(row.titleMn),
    fields: [
      {
        key: 'topic',
        label: 'Хэсэг',
        type: 'select',
        required: true,
        options: TIP_TOPICS.map((topic) => ({ value: topic, label: TIP_TOPIC_MN[topic] })),
      },
      ...bilingual('titleMn', 'titleEn', 'Гарчиг', 'text', true),
      ...bilingual('bodyMn', 'bodyEn', 'Агуулга', 'textarea', true, 4),
    ],
  },
  {
    kind: 'phrases',
    label: 'Хэллэг',
    singular: 'хэллэг',
    titleOf: (row) => asText(row.phraseMn),
    fields: [
      { key: 'phraseMn', label: 'Монгол хэллэг', type: 'text', required: true },
      {
        key: 'pronunciation',
        label: 'Латин уншлага',
        type: 'text',
        required: true,
        hint: 'Жишээ: Bayarlalaa',
      },
      { key: 'meaningEn', label: 'Англи орчуулга', type: 'text', required: true },
      {
        key: 'category',
        label: 'Хэсэг',
        type: 'select',
        required: true,
        options: PHRASE_CATEGORIES.map((category) => ({
          value: category,
          label: PHRASE_CATEGORY_MN[category],
        })),
      },
    ],
  },
  {
    kind: 'events',
    label: 'Арга хэмжээ',
    singular: 'арга хэмжээ',
    titleOf: (row) => asText(row.titleMn),
    fields: [
      ...bilingual('titleMn', 'titleEn', 'Нэр', 'text', true),
      { key: 'startDate', label: 'Эхлэх өдөр', type: 'date', required: true },
      {
        key: 'endDate',
        label: 'Дуусах өдөр',
        type: 'date',
        hint: 'Нэг өдрийн арга хэмжээ бол хоосон орхи.',
      },
      ...bilingual('placeMn', 'placeEn', 'Газар'),
      ...bilingual('descriptionMn', 'descriptionEn', 'Тайлбар', 'textarea', false, 3),
      { key: 'link', label: 'Холбоос', type: 'text', hint: 'http:// эсвэл https:// байх ёстой.' },
    ],
  },
];

export const resourceFor = (kind: CityKind): CityResource =>
  CITY_RESOURCES.find((resource) => resource.kind === kind) ?? CITY_RESOURCES[0];
