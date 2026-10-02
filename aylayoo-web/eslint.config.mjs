import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

/* Self-contained, unlike goal-tracker-web's, which imports the monorepo's root config and the
 * Nx eslint plugin.
 *
 * This app is also checked out on its own in the Aylay-oo team's repo, where neither exists —
 * so the Nx pieces are loaded only if they happen to be there. What they add is the
 * `@nx/enforce-module-boundaries` rule, which governs imports between workspace projects and
 * is meaningless for an app that imports nothing outside itself.
 */
const nx = await import('@nx/eslint-plugin').then((m) => m.default).catch(() => null);

export default [
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      /* This app is App Router only, so there is no `pages` directory for the rule to scan
       * and it warns on every run looking for one. */
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  // Only in the monorepo; absent in the standalone checkout.
  ...(nx ? nx.configs['flat/react-typescript'] : []),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        // Type-aware linting is deliberately off: `nx run aylayoo-web:typecheck` already runs
        // tsc over the same files, and turning it on here doubles the work for no new findings.
        project: null,
      },
    },
  },
  {
    ignores: ['.next/**/*', '.open-next/**/*', 'scripts/**/*'],
  },
];
