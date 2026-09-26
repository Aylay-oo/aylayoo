//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},

  // No `output: 'standalone'` here, unlike goal-tracker-web: that exists so
  // opennextjs-cloudflare can bundle a Worker. This app deploys to Vercel, which wants
  // the default build output.
  outputFileTracingRoot: require('path').join(__dirname, '../../../'),

  images: {
    // Every photo is a local file in public/images, so no remotePatterns are needed.
    // Guide photos uploaded to R2 come through the API instead — add its host here if
    // they ever need next/image optimisation.
    formats: ['image/webp'],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
