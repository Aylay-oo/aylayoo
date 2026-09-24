import { defineConfig } from 'drizzle-kit';

// Only used to GENERATE migration SQL files from src/db/schema.ts.
// Wrangler applies them to D1 (see wrangler.jsonc -> migrations_dir).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
