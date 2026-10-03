# The Health Gazette

> A student scientific editorial publication by the Cancer Research & Awareness Student Scientific Forum (CRA–SSF) at Abu Dhabi University.

## Overview

The Health Gazette is the digital home of CRA-SSF's monthly student scientific editorial. It serves as both the public face of the Gazette and a platform for its issues, articles, events, and student contributors.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | [Astro 5](https://astro.build/) + TypeScript | Static site generation — fast, zero JS by default, perfect for a content publication |
| **Styling** | CSS Custom Properties | Bespoke editorial design system — no framework, every decision is deliberate |
| **CMS** | [Sanity](https://www.sanity.io/) | Structured content, real-time editing, image pipeline, generous free tier |
| **Hosting** | [Cloudflare Pages](https://pages.cloudflare.com/) | Free, global CDN, automatic deployments |
| **Forms** | Formspree | Simple submission handling, free tier (50/month) |
| **Analytics** | Cloudflare Web Analytics | Privacy-friendly, free |

## Project Structure

```
CRASF editorial/
├── public/              # Static assets (favicon, images)
├── src/
│   ├── components/      # Reusable Astro components
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── EditorialRule.astro
│   │   └── SectionHeading.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── sanity.ts    # Sanity client + GROQ queries
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   ├── about.astro         # About CRA-SSF
│   │   ├── gazette/
│   │   │   └── index.astro     # Issue archive
│   │   ├── events/
│   │   │   └── index.astro     # Events listing
│   │   └── submit/
│   │       └── index.astro     # Article submission form
│   └── styles/
│       └── global.css          # THE design system
├── .env.example
├── .gitignore
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

## Design System

The visual language borrows from traditional editorial design — serif mastheads, horizontal rules, column layouts, and warm paper tones — while using modern CSS for responsive reading.

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Signal Red | `#C1121F` | Accents, CTAs, editorial marks — rare and intentional |
| Ink Black | `#1A1A1A` | Primary text — not pure black for reading comfort |
| Paper White | `#FFFFFF` | Primary canvas |
| Warm Paper | `#F7F3EA` | Alternating section backgrounds |
| Parchment | `#F0E6D2` | Issue covers, masthead, archival accent |
| Muted | `#6B6B6B` | Metadata, captions, secondary text |
| Line | `#CFC9BE` | Borders, editorial rules |

### Typography

| Role | Font | Usage |
|------|------|-------|
| Display | Source Serif 4 | Headlines, masthead, pull quotes |
| Body | Inter | Body text, navigation, UI elements |

### Editorial Rules

The horizontal rule is the newspaper's most distinctive visual element:

- `rule-thin` — subtle divider
- `rule-medium` — standard section break
- `rule-thick` — major section break
- `rule-double` — classic newspaper double line
- `rule-accent` — red accent (use sparingly)
- `rule-ornamental` — decorative triple-line (masthead/covers)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
PUBLIC_SANITY_PROJECT_ID=your_project_id
PUBLIC_SANITY_DATASET=production
PUBLIC_SANITY_API_VERSION=2026-09-01
PUBLIC_FORMSPREE_ENDPOINT=your_form_id
```

## Deployment

The site deploys automatically to Cloudflare Pages on push to `main`.

When content changes in Sanity, a webhook triggers a rebuild.

## Content Management

Editors manage content through Sanity Studio. The editorial workflow:

```
Student submits pitch (via /submit)
    ↓
Editorial team reviews
    ↓
If accepted, student writes full article
    ↓
Editorial team edits + fact-checks
    ↓
Published in Sanity → triggers site rebuild
    ↓
Article appears on website
```

## CMS Schemas (Phase 2)

- `article` — Articles with title, body, category, author, references
- `issue` — Monthly gazette issues with cover, articles, PDF
- `event` — Events with date, type, location, registration
- `person` — Authors and editorial team members
- `category` — Article categories (Spotlight, Campus Research, etc.)
- `siteSettings` — Global settings (social links, contact, branding)

---

**Maintained by the CRA-SSF development team.**
