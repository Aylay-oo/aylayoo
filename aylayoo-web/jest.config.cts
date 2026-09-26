const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  displayName: 'aylayoo-web',
  preset: '../../../jest.preset.js',
  // Matches goal-tracker-web: `next/jest` already wires up the SWC transform plus CSS and
  // asset stubs, so no @nx/react jest plugin here.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../../coverage/apps/aylayoo/aylayoo-web',
  testEnvironment: 'jsdom',
  // Specs live next to the code they cover.
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.spec.tsx'],
  // Polyfills window.matchMedia, which jsdom lacks and the hover/reduced-motion code needs.
  setupFiles: ['<rootDir>/jest-setup.ts'],
};

const jestConfig = createJestConfig(config);

module.exports = async () => {
  const resolved = await jestConfig();
  // Disable SWC path alias resolution — handled by the Nx jest resolver.
  for (const value of Object.values(resolved.transform)) {
    if (Array.isArray(value) && value[1]?.resolvedBaseUrl) {
      value[1] = { ...value[1], resolvedBaseUrl: undefined };
    }
  }
  return resolved;
};
