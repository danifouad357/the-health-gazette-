// =============================================================================
// SANITY CLIENT — The Health Gazette
// =============================================================================
// Centralized Sanity client configuration.
// All CMS queries go through this module.
//
// USAGE:
//   import { sanityClient, urlFor } from '@lib/sanity';
//   const articles = await sanityClient.fetch('*[_type == "article"]');
//   const imageUrl = urlFor(article.coverImage).width(800).url();
// =============================================================================

import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------
// useCdn: true for production (faster, cached responses)
// useCdn: false for development (always fresh data)
// The API version is date-based — Sanity uses this to ensure stable behavior.
// -----------------------------------------------------------------------------
export const sanityClient = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || '',
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || 'production',
  apiVersion: import.meta.env.PUBLIC_SANITY_API_VERSION || '2026-09-01',
  useCdn: import.meta.env.PROD,
});

// -----------------------------------------------------------------------------
// Image URL Builder
// -----------------------------------------------------------------------------
// Sanity's image pipeline handles resizing, cropping, and format conversion.
// Use urlFor(imageRef).width(800).height(600).format('webp').url()
// to generate optimized image URLs on the fly.
// -----------------------------------------------------------------------------
const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// -----------------------------------------------------------------------------
// GROQ Query Helpers
// -----------------------------------------------------------------------------
// These will be populated as we build out the CMS schemas.
// Each query is a GROQ string that Sanity executes server-side.
// Keeping them here (rather than inline in pages) makes them:
//   1. Reusable across pages
//   2. Testable independently
//   3. Easy to find and update
// -----------------------------------------------------------------------------

// Placeholder — will be replaced with real queries in Phase 2
export const queries = {
  // All published articles, newest first
  allArticles: `*[_type == "article" && !(_id in path("drafts.**"))] | order(publishedAt desc)`,

  // All published issues, newest first
  allIssues: `*[_type == "issue" && !(_id in path("drafts.**"))] | order(releaseDate desc)`,

  // Latest issue (for homepage hero)
  latestIssue: `*[_type == "issue" && !(_id in path("drafts.**"))] | order(releaseDate desc) [0]`,

  // Upcoming events (future dates)
  upcomingEvents: `*[_type == "event" && date >= now() && !(_id in path("drafts.**"))] | order(date asc)`,

  // Site settings (singleton)
  siteSettings: `*[_type == "siteSettings"][0]`,
};
