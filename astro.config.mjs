// =============================================================================
// ASTRO CONFIGURATION — The Health Gazette
// =============================================================================
// Static site generation (SSG) is used because this is a content publication,
// not a web application. Pages are pre-rendered at build time from CMS data.
// When content changes in Sanity, a webhook triggers a rebuild on Cloudflare.
// =============================================================================

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import { loadEnv } from 'vite';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  ""
);

export default defineConfig({
  // Static output — no server runtime needed.
  // Cloudflare Pages serves the pre-built HTML directly.
  output: 'static',

  integrations: [
    react(),
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      useCdn: false, // False for static builds
    }),
  ],

  // Site URL — update this when we have a real domain.
  // Used for canonical URLs, sitemap, and OG tags.
  site: 'https://the-health-gazette.pages.dev',

  // Vite configuration
  vite: {
    // CSS modules use camelCase for class name exports
    css: {
      modules: {
        localsConvention: 'camelCase',
      },
    },
  },
});
