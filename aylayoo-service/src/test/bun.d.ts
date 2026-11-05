/* The slice of Bun's built-in modules the tests use.
 *
 * `bun-types` is not a dependency of this workspace — it sits in the store as a transitive one,
 * so `"types": ["bun-types"]` does not resolve — and adding it would mean editing the
 * monorepo's root package.json, outside this app. These declarations cover only what
 * src/test/d1.ts and the specs actually call, so `tsc` checks the test code properly rather
 * than being told to skip it.
 *
 * They are a convenience for the typechecker, not a contract: `bun test` runs against the real
 * modules, so a wrong declaration here shows up as a failing test rather than passing silently.
 */

declare module 'bun:test' {
  export function describe(label: string, body: () => void): void;
  /* `test` is callable and also carries `.each`, so it is declared as a value with a call
   * signature rather than a plain function. Only the one-argument `each` form is declared,
   * which is the only one used here. */
  type TestFn = {
    (label: string, body: () => void | Promise<void>): void;
    each<T>(cases: readonly T[]): (label: string, body: (arg: T) => void | Promise<void>) => void;
  };
  export const test: TestFn;
  export function beforeAll(body: () => void | Promise<void>): void;
  export function afterAll(body: () => void | Promise<void>): void;
  export function beforeEach(body: () => void | Promise<void>): void;
  export function afterEach(body: () => void | Promise<void>): void;

  type Matchers = {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toMatch(expected: string | RegExp): void;
    /** Strings and arrays both. */
    toContain(expected: unknown): void;
    toMatchObject(expected: object): void;
    toHaveLength(expected: number): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeGreaterThan(expected: number): void;
    not: Matchers;
  };
  export function expect(actual: unknown): Matchers;
}

declare module 'bun:sqlite' {
  /** What `db.query(sql)` returns: a prepared statement bound positionally at call time. */
  export class Statement {
    all(...params: unknown[]): unknown[];
    values(...params: unknown[]): unknown[][];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): void;
  }

  export class Database {
    constructor(filename?: string);
    query(sql: string): Statement;
    /** Runs one or more statements; used here to apply the migrations. */
    exec(sql: string): void;
    run(sql: string): void;
    transaction<T extends (...args: never[]) => unknown>(body: T): T;
    close(): void;
  }
}

/* Bun's addition to import.meta, used to find drizzle/ from src/test/. Declared at the top
 * level of a script file (this one has no import or export), so it augments the global type
 * rather than declaring a module-local one. */
interface ImportMeta {
  /** The directory holding the current file. */
  readonly dir: string;
}
