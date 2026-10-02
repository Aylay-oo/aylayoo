// Turns the tourism association's guide roster into an idempotent SQL import.
//
//   node scripts/build-guide-import.mjs "~/Downloads/mto_hotch_50 (1).xlsx"
//
// The spreadsheet holds 50 real people's phone numbers and email addresses, so:
//   - the output goes to private/, which is gitignored;
//   - neither the spreadsheet nor the output is ever committed;
//   - this script is committed, because it carries the mapping rules and no data.
//
// Only five columns are read — name, phone, email, languages, experience. The sheet also has
// "Имэйл явуулсан", "Хариу" and "Gmail thread ID", which are the association's internal
// correspondence notes and deliberately never reach the database.
//
// xlsx is parsed straight out of the zip, because no spreadsheet library is installed and
// adding one would mean touching the root package.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICE = dirname(HERE);
const SHEET_NAME = 'Хөтчүүд';

/** Mongolian language names → the codes the API stores. */
const LANGUAGE_CODES = {
  Англи: 'en',
  Солонгос: 'ko',
  Орос: 'ru',
  Хятад: 'zh',
  Герман: 'de',
  Түрк: 'tr',
  Испани: 'es',
  Итали: 'it',
  Франц: 'fr',
  Монгол: 'mn',
  Япон: 'ja',
};

/** The bands the roster uses. Anything else is a data change worth stopping for. */
const EXPERIENCE_RANGES = new Set(['Анхны жил', '1-3 жил', '4-6 жил', '7-9 жил', '10+ жил']);

/* ---------------------------------------------------------------- xlsx reading */

/** Reads one sheet as an array of { columnLetter: text } rows. */
function readSheet(path, sheetName) {
  // `unzip -p` avoids hand-rolling a zip reader; it ships with macOS and Linux.
  const read = (entry, optional = false) => execFileSync('unzip', ['-p', path, entry], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // An optional entry that is missing makes unzip warn on stderr before failing; the
    // caller handles the failure, so the warning is just noise.
    stdio: optional ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'inherit'],
  });

  const workbook = read('xl/workbook.xml');
  const sheets = [...workbook.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="(rId\d+)"/g)];
  const match = sheets.find(([, name]) => name === sheetName);
  if (!match) {
    throw new Error(`Sheet ${JSON.stringify(sheetName)} not found. Found: ${sheets.map(([, n]) => n).join(', ')}`);
  }

  /* Each <Relationship> is matched whole and its attributes read separately, because XML
   * puts no guarantee on attribute order — this workbook writes Target before Id, and a
   * pattern expecting the other order silently finds nothing. */
  const rels = read('xl/_rels/workbook.xml.rels');
  const target = [...rels.matchAll(/<Relationship\b([^>]*)\/>/g)]
    .map(([, attrs]) => ({
      id: attrs.match(/\bId="([^"]*)"/)?.[1],
      target: attrs.match(/\bTarget="([^"]*)"/)?.[1],
    }))
    .find((rel) => rel.id === match[2])?.target;
  if (!target) throw new Error(`No relationship target for ${match[2]}`);
  const entry = `xl/${target.replace(/^\/?xl\//, '')}`;

  /* Shared strings are optional — this workbook stores its text inline, but a file saved by
   * a different tool would use the table, and silently reading nothing would be worse than
   * failing. */
  let shared = [];
  try {
    const xml = read('xl/sharedStrings.xml', true);
    shared = [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)]
      .map(([, si]) => [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(([, t]) => t).join(''));
  } catch {
    // No sharedStrings.xml in this workbook.
  }

  const unescape = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

  const sheetXml = read(entry);
  return [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(([, rowXml]) => {
    const cells = {};
    for (const [, ref, attrs, body] of rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      let text = '';
      if (body) {
        if (/t="s"/.test(attrs)) {
          const index = Number(body.match(/<v>(\d+)<\/v>/)?.[1]);
          text = shared[index] ?? '';
        } else {
          // Inline string, or a plain value.
          const parts = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(([, t]) => t);
          text = parts.length ? parts.join('') : (body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '');
        }
      }
      cells[ref] = unescape(text).trim();
    }
    return cells;
  });
}

/* ---------------------------------------------------------------- transform */

const sqlString = (value) => (value == null || value === ''
  ? 'NULL'
  : `'${String(value).replace(/'/g, "''")}'`);

/**
 * "Жаргал Содномпил" → "Ж. Содномпил".
 *
 * The roster writes the father's name first and the given name second, and the design shows
 * the father's name as an initial. Anything that is not exactly two words is reported rather
 * than guessed at.
 */
function displayName(full, problems, row) {
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length !== 2) {
    problems.push(`row ${row}: name is ${words.length} words, expected 2 — imported as written`);
    return full;
  }
  const [father, given] = words;
  return `${[...father][0].toLocaleUpperCase('mn-MN')}. ${given}`;
}

function languageCodes(value, problems, row) {
  if (!value) return [];
  const codes = [];
  for (const part of value.split(',').map((p) => p.trim()).filter(Boolean)) {
    const code = LANGUAGE_CODES[part];
    if (!code) {
      problems.push(`row ${row}: unknown language ${JSON.stringify(part)} — left out`);
      continue;
    }
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function main() {
  const input = process.argv[2]
    ? resolve(process.argv[2].replace(/^~/, homedir()))
    : join(homedir(), 'Downloads', 'mto_hotch_50 (1).xlsx');
  if (!existsSync(input)) {
    console.error(`Spreadsheet not found: ${input}`);
    process.exit(1);
  }

  const rows = readSheet(input, SHEET_NAME);
  const header = rows[0] ?? {};
  const COLUMNS = { name: 'B', phone: 'C', email: 'D', languages: 'E', experience: 'F' };
  const EXPECTED = {
    B: 'Овог Нэр', C: 'Утасны дугаар', D: 'И-мэйл', E: 'Мэддэг хэл', F: 'Ажилласан хугацаа',
  };
  for (const [column, title] of Object.entries(EXPECTED)) {
    if (header[column] !== title) {
      console.error(`Column ${column} reads ${JSON.stringify(header[column])}, expected ${JSON.stringify(title)}.`);
      console.error('The sheet layout has changed — check it before importing.');
      process.exit(1);
    }
  }

  const problems = [];
  const guides = [];

  rows.slice(1).forEach((row, i) => {
    const lineNumber = i + 2;
    const fullName = row[COLUMNS.name] ?? '';
    if (!fullName) {
      problems.push(`row ${lineNumber}: no name — skipped`);
      return;
    }

    /* One row lists two addresses separated by a comma. Only the first is stored, so the
     * admin screen's mailto: link works; the second is reported here. */
    const rawEmail = row[COLUMNS.email] ?? '';
    const emails = rawEmail.split(',').map((e) => e.trim()).filter(Boolean);
    if (emails.length > 1) {
      problems.push(`row ${lineNumber}: ${emails.length} email addresses — stored the first only`);
    }

    const experience = row[COLUMNS.experience] ?? '';
    if (experience && !EXPERIENCE_RANGES.has(experience)) {
      problems.push(`row ${lineNumber}: unexpected experience ${JSON.stringify(experience)} — stored as written`);
    }

    guides.push({
      name: displayName(fullName, problems, lineNumber),
      fullName,
      phone: row[COLUMNS.phone] ?? '',
      email: emails[0] ?? '',
      languages: languageCodes(row[COLUMNS.languages], problems, lineNumber),
      experienceRange: experience,
    });
  });

  const lines = [];
  lines.push(`-- aylayoo: ${guides.length} guides from the Mongolian tourism association's roster.
--
-- GENERATED, AND NOT FOR COMMITTING. Holds real phone numbers and email addresses; this file
-- lives in private/, which is gitignored. Regenerate with:
--   node scripts/build-guide-import.mjs "<path to the xlsx>"
--
-- Source: ${SHEET_NAME} sheet, columns Овог Нэр / Утасны дугаар / И-мэйл / Мэддэг хэл /
-- Ажилласан хугацаа. The sheet's "Имэйл явуулсан", "Хариу" and "Gmail thread ID" columns are
-- the association's internal notes and are deliberately not imported.
--
-- Every guide is type 'individual' and status 'approved': the association has approved
-- sharing this information, so they are listed rather than queued for review.
--
-- Left empty on purpose, because the roster does not have it: aimags, trip types, route, bio
-- and photo. rating and review_count stay NULL — those are earned from real travellers.
-- Experience is a band, not a number, so experience_range carries it and experience_years
-- stays NULL. A guide with no aimags shows in the guides carousel but cannot appear in the
-- map's recommendations, which needs an aimag to match on; add them through /admin.
--
-- Safe to run twice: each insert is guarded on the email address.

-- The five pre-launch sample guides, in case this runs before the design import.
DELETE FROM guide_aimags WHERE guide_id IN (SELECT id FROM guides WHERE name LIKE '%(sample)%');
DELETE FROM guides WHERE name LIKE '%(sample)%';
`);

  for (const guide of guides) {
    lines.push(`INSERT INTO guides (type, status, name, full_name, phone, email, languages, trip_types, experience_range)
  SELECT 'individual', 'approved', ${sqlString(guide.name)}, ${sqlString(guide.fullName)}, ${sqlString(guide.phone)}, ${sqlString(guide.email)}, ${sqlString(JSON.stringify(guide.languages))}, '[]', ${sqlString(guide.experienceRange)}
  WHERE NOT EXISTS (SELECT 1 FROM guides WHERE email = ${sqlString(guide.email)});`);
  }

  const outPath = join(SERVICE, 'private', 'prod-guides-import.sql');
  writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');

  // Deliberately prints no names, numbers or addresses.
  console.log(`${guides.length} guides → private/prod-guides-import.sql`);
  const languageCount = new Map();
  for (const guide of guides) {
    for (const code of guide.languages) languageCount.set(code, (languageCount.get(code) ?? 0) + 1);
  }
  console.log('languages:', [...languageCount].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' '));
  const rangeCount = new Map();
  for (const guide of guides) rangeCount.set(guide.experienceRange, (rangeCount.get(guide.experienceRange) ?? 0) + 1);
  console.log('experience:', [...rangeCount].map(([r, n]) => `${r}=${n}`).join(' | '));
  console.log('guides with no language mapped:', guides.filter((g) => g.languages.length === 0).length);

  if (problems.length) {
    console.log(`\n${problems.length} thing(s) to look at:`);
    for (const problem of problems) console.log(`  - ${problem}`);
  }
}

main();
