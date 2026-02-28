# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase including React components, Next.js pages, and utilities
- JavaScript - Configuration files (next.config.js, postcss.config.js, tailwind.config.ts)

**Secondary:**
- SQL - Database schema and migrations (Supabase PostgreSQL)
- CSS - Global styles in `src/app/globals.css`, processed via Tailwind and PostCSS

## Runtime

**Environment:**
- Node.js (version managed via npm, compatible with Next.js 16)

**Package Manager:**
- npm - Manages all dependencies
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.1 - Full-stack web framework with App Router (not Pages Router)
- React 19.0.0 - UI library for component development
- React DOM 19.0.0 - DOM rendering for React components

**Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.49 - CSS transformation tool (autoprefixer plugin)
- Autoprefixer 10.4.20 - Cross-browser CSS prefixing

**UI Features:**
- @dnd-kit/core 6.1.0 - Drag-and-drop functionality
- @dnd-kit/sortable 8.0.0 - Sortable drag-and-drop extensions
- @dnd-kit/utilities 3.2.2 - Helper utilities for @dnd-kit
- clsx 2.1.0 - Conditional CSS class composition
- date-fns 3.0.0 - Date/time utilities (date formatting, calculations)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.47.10 - PostgreSQL database client and auth
  - Used for all data queries, mutations, and real-time subscriptions
  - Initialized in `src/lib/supabase.ts`
  - All API interactions routed through `src/lib/api.ts`

**Infrastructure:**
- next (16.1.1) - Next.js framework (includes dev server, build tools)
- typescript (5.9.3) - Static type checking and compilation

**Development:**
- @types/node 22.10.5 - TypeScript types for Node.js
- @types/react 19.0.1 - TypeScript types for React
- @types/react-dom 19.0.2 - TypeScript types for React DOM
- eslint 9.18.0 - Code linting (via eslint-config-next)
- eslint-config-next 16.1.1 - Next.js ESLint configuration

## Configuration

**Environment:**
- `.env.local` - Local environment variables (not in git)
- `.env.example` - Template showing required variables
- Required variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public)

**Build:**
- `next.config.js` - Next.js configuration (strict mode enabled)
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Module: ESNext
  - Strict mode: Enabled (`"strict": true`)
  - Path aliases: `@/*` maps to `./src/*`
- `tailwind.config.ts` - Tailwind CSS configuration
  - Custom colors for services, statuses, priorities
  - Custom animations (slide-down, fade-in, count-up, pulse-slow)
  - Content paths scanned: `src/pages/**`, `src/components/**`, `src/app/**`
- `postcss.config.js` - PostCSS configuration (Tailwind + Autoprefixer)

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- npm (v8+ recommended)
- Modern browser with ES2017 support
- TypeScript compiler (installed via npm)

**Production:**
- Deployment target: Vercel (primary)
  - Auto-deploys from `main` branch
  - Deploy URL: https://gormost.vercel.app
- Node.js runtime (provided by Vercel)
- Supabase PostgreSQL database connection
- Environment variables configured in Vercel dashboard

## Development Workflow

**Commands:**
```bash
npm install              # Install dependencies
npm run dev              # Start local dev server (http://localhost:3000)
npm run build            # Production build (must pass before commits)
npm run lint             # Run ESLint checks
npx tsc --noEmit         # TypeScript verification without compilation
```

**Build Output:**
- `.next/` directory - Next.js build artifacts
- TypeScript compilation: `tsconfig.tsbuildinfo` for incremental builds

---

*Stack analysis: 2026-03-01*
