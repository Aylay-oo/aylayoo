const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
  dir: './',
});

/* No `preset: '../../../jest.preset.js'`, unlike goal-tracker-web.
 *
 * That preset is a passthrough of @nx/jest/preset, and this app is also checked out on its
 * own in the Aylay-oo team's repo, where neither that path nor @nx/jest exists. `next/jest`
 * already provides what matters — the SWC transform, CSS and asset stubs, and module
 * resolution — and every import here is relative, so nothing needed the Nx resolver's path
 * alias support.
 */
const config = {
  displayName: 'aylayoo-web',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  // Specs live next to the code they cover.
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.spec.tsx'],
  /* Polyfills window.matchMedia and ResizeObserver, which jsdom lacks, and clears
   * localStorage between tests so a language switch does not leak into the next one.
   * setupFilesAfterEnv rather than setupFiles, because it registers a beforeEach and the
   * test framework has to exist by then. */
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
};

module.exports = createJestConfig(config);
