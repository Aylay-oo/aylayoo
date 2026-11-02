/* A D1Database backed by an in-memory SQLite, so the routes can be tested without a Worker.
 *
 * Why a shim rather than Miniflare: miniflare is only present here as a transitive dependency
 * of wrangler, and making it a real one would mean editing the monorepo's root package.json —
 * outside this app. `bun:sqlite` is built into the runtime this service already uses (see
 * CLAUDE.md), so this costs no dependency at all.
 *
 * The surface is small because drizzle's D1 driver only uses a little of it:
 * `prepare(sql).bind(...params)` then `.all()`, `.run()` or `.raw()`, plus `batch()`. Each
 * result is the `{ results, success, meta }` envelope the driver destructures. `run()`
 * deliberately returns rows too — drizzle's `.returning()` goes through it.
 *
 * It is a test double, not a D1 emulator: no network, no size limits, and `batch` is wrapped in
 * a transaction rather than reproducing D1's exact batching semantics. What it is good for is
 * the thing these tests check — that the route handlers, the Zod schemas and the SQL drizzle
 * generates behave as intended.
 */

import { Database } from 'bun:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type Row = Record<string, unknown>;
type D1Result = { results: Row[]; success: true; meta: Record<string, unknown> };

const envelope = (results: Row[]): D1Result => ({ results, success: true, meta: {} });

class ShimStatement {
  constructor(
    private readonly db: Database,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new ShimStatement(this.db, this.sql, params);
  }

  async all(): Promise<D1Result> {
    return envelope(this.db.query(this.sql).all(...(this.params as never[])) as Row[]);
  }

  /* Rows as well as an envelope: an INSERT … RETURNING arrives here, and drizzle's
   * `.returning()` reads them straight back off it. */
  async run(): Promise<D1Result> {
    return this.all();
  }

  /** Positional arrays, which is what drizzle's `.values()` path expects. */
  async raw(): Promise<unknown[][]> {
    return this.db.query(this.sql).values(...(this.params as never[])) as unknown[][];
  }

  async first(): Promise<Row | null> {
    return (await this.all()).results[0] ?? null;
  }
}

class ShimD1 {
  constructor(private readonly db: Database) {}

  prepare(sql: string) {
    return new ShimStatement(this.db, sql);
  }

  /** Atomic, like the real thing — the reorder handler depends on all-or-nothing. */
  async batch(statements: ShimStatement[]): Promise<D1Result[]> {
    const results: D1Result[] = [];
    const run = this.db.transaction(() => undefined);
    run();
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}

/** Every migration in drizzle/, applied in order — the same schema production has. */
function applyMigrations(db: Database) {
  const dir = join(import.meta.dir, '..', '..', 'drizzle');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) db.exec(trimmed);
    }
  }
}

/**
 * A fresh database with the real schema, as a D1Database.
 *
 * Built from the committed migrations rather than from a hand-written CREATE TABLE, so a
 * column added to schema.ts without a migration fails these tests too.
 */
export function createTestDb(): D1Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  applyMigrations(db);
  return new ShimD1(db) as unknown as D1Database;
}
