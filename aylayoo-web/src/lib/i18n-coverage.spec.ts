import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { translate } from './i18n';

/* Guards the English side of the site.
 *
 * Every Mongolian string the interface shows has to come out of translate() as English —
 * either from the dictionary or from one of the runtime patterns. It is easy to add a new
 * label and forget its translation, and the result is a half-Mongolian page that nobody
 * notices until a visitor does, because the Mongolian side looks perfect.
 *
 * So this walks the component sources, pulls out every literal that is handed to the
 * translator, and fails if any of them survives untranslated.
 */

const SOURCE_ROOT = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.spec.')) return [];
    return [path];
  });
}

/** Comments are stripped first: i18n.tsx documents forms that deliberately do NOT work. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const CYRILLIC = /[А-Яа-яЁёӨөҮү]/;

/** Literals passed to t(), and to the props whose components translate them. */
function translatedLiterals(source: string): string[] {
  const code = withoutComments(source);
  const found: string[] = [];
  for (const match of code.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g)) {
    found.push(match[1].replace(/\\'/g, "'"));
  }
  for (const match of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) {
    found.push(match[1]);
  }
  // <Notice message="…" /> and <LoadingLive label="…" /> translate internally.
  for (const match of code.matchAll(/(?:message|label)="([^"]+)"/g)) {
    found.push(match[1]);
  }
  return found;
}

describe('English coverage', () => {
  const files = sourceFiles(SOURCE_ROOT);

  it('finds the component sources to scan', () => {
    // A broken glob would make every assertion below pass for the wrong reason.
    expect(files.length).toBeGreaterThan(15);
  });

  const strings = new Map<string, string>();
  for (const file of files) {
    for (const literal of translatedLiterals(readFileSync(file, 'utf8'))) {
      if (CYRILLIC.test(literal) && !strings.has(literal)) {
        strings.set(literal, file.slice(SOURCE_ROOT.length + 1));
      }
    }
  }

  it('has strings to check', () => {
    expect(strings.size).toBeGreaterThan(50);
  });

  it('translates every Mongolian string the interface shows', () => {
    const untranslated = [...strings]
      .filter(([mn]) => translate(mn) === mn)
      .map(([mn, file]) => `${file}: ${mn}`);

    // Named individually, so a failure says exactly which string needs an entry in
    // i18n-extra.ts rather than just a count.
    expect(untranslated).toEqual([]);
  });

  it('leaves no Mongolian behind in what it produces', () => {
    const leftovers = [...strings]
      .map(([mn, file]) => [translate(mn), mn, file] as const)
      .filter(([en]) => CYRILLIC.test(en))
      .map(([en, mn, file]) => `${file}: ${mn} → ${en}`);

    expect(leftovers).toEqual([]);
  });
});
