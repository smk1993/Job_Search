# CLAUDE.md

This file provides guidance for Claude when working in this repository.

## Project Overview

AI-powered job search SaaS platform for international job seekers. Core features:
- Work authorization filtering (filters jobs based on visa status)
- Multi-platform job search (LinkedIn, Indeed, Glassdoor, ZipRecruiter, Reddit)
- AI cover letter generation (Claude/Anthropic streaming)
- Application tracking and analytics
- Direct recruiter email outreach

## Tech Stack

- **Framework**: Next.js 14.2 (App Router, TypeScript)
- **Database**: PostgreSQL + Prisma 7.4 ORM (`@prisma/adapter-pg`)
- **Auth**: NextAuth.js v5 (Google OAuth + credentials)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS v3
- **Data fetching**: TanStack React Query v5
- **AI**: Anthropic SDK (Claude, streaming cover letters)
- **Email**: Resend API
- **Job data**: JSearch (RapidAPI), Reddit OAuth (snoowrap)
- **Validation**: Zod + React Hook Form
- **Charts**: Recharts
- **Notifications**: Sonner

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── (dashboard)/     # Protected routes (dashboard, jobs, saved, applications,
│   │                    #   cover-letters, email, reddit-jobs, recruiters, stats, settings)
│   ├── api/             # API route handlers
│   └── page.tsx         # Landing page
├── components/
│   ├── jobs/            # JobCard, RedditJobCard, WorkAuthBadge
│   ├── layout/          # Sidebar, TopNav
│   ├── shared/          # EmptyState and other shared components
│   └── ui/              # shadcn/ui components (30+ components)
├── hooks/
│   └── useJobs.ts       # React Query hooks
├── lib/
│   ├── anthropic.ts     # Claude AI integration (cover letter generation)
│   ├── auth.ts          # NextAuth config (providers, callbacks)
│   ├── jsearch.ts       # JSearch API wrapper
│   ├── prisma.ts        # Prisma client singleton
│   ├── reddit.ts        # Reddit scraper
│   ├── resend.ts        # Email delivery
│   ├── utils.ts         # cn() and other utilities
│   └── work-auth-filter.ts  # Regex-based work auth filtering logic
├── providers/
│   ├── QueryProvider.tsx    # React Query provider
│   └── SessionProvider.tsx  # NextAuth session provider
└── types/
    └── job.ts           # Job type definitions
prisma/
└── schema.prisma        # Database schema
```

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

After schema changes:
```bash
npx prisma migrate dev   # Apply migrations
npx prisma generate      # Regenerate Prisma client
npx prisma studio        # Open Prisma Studio (GUI)
```

## Environment Variables

Create `.env.local` with the following:

```
# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://user@localhost:5432/jobsearch

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=

# RapidAPI (JSearch)
RAPIDAPI_KEY=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Reddit API
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register` | User registration |
| GET | `/api/jobs/search` | Search jobs via JSearch + work auth filter |
| GET | `/api/jobs/reddit` | Scrape Reddit job posts |
| POST | `/api/jobs/save` | Save/unsave a job |
| GET | `/api/jobs/saved` | Get user's saved jobs |
| POST | `/api/jobs/create-temp` | Create temp job for cover letter |
| GET/PATCH | `/api/applications` | List / update application status |
| POST | `/api/cover-letter/generate` | Generate cover letter (SSE streaming) |
| POST | `/api/email/send` | Send recruiter email |
| GET | `/api/email/history` | Email send history |
| GET/POST | `/api/recruiters` | List / add recruiter contacts |
| GET/PATCH | `/api/settings` | Get / update user profile |
| GET | `/api/stats` | Application funnel analytics |

## Database Schema (Prisma Models)

- **User** - Profile, visa status, country, preferences
- **Account** - OAuth provider accounts (NextAuth)
- **Session** - JWT session tracking (NextAuth)
- **Job** - Cached job listings (source URL unique)
- **SavedJob** - User ↔ Job many-to-many (unique: userId + jobId)
- **JobApplication** - Application tracking with status enum
- **CoverLetter** - AI-generated cover letters linked to jobs
- **RecruiterContact** - Recruiter directory per user
- **EmailLog** - Outbound email history
- **VerificationToken** - Email verification tokens

## Key Patterns and Conventions

**Route Groups**: `(auth)` and `(dashboard)` are Next.js route groups. The dashboard layout (`src/app/(dashboard)/layout.tsx`) acts as an auth guard — unauthenticated users are redirected to `/login`.

**Work Authorization Filtering** (`src/lib/work-auth-filter.ts`): Regex patterns detect US work authorization requirements in job descriptions. Matches against user's `visaStatus` (enum: `CITIZEN`, `PERMANENT_RESIDENT`, `WORK_VISA`, `STUDENT_VISA`, `NO_AUTHORIZATION`).

**Cover Letter Streaming**: `POST /api/cover-letter/generate` uses Anthropic streaming and returns a `ReadableStream` (SSE). The client reads the stream chunk-by-chunk in the cover letters page.

**Prisma singleton** (`src/lib/prisma.ts`): Uses a module-level singleton pattern for the Prisma client to avoid connection exhaustion in dev (hot reload).

**React Query hooks** (`src/hooks/useJobs.ts`): Centralizes all data fetching. Mutations use `queryClient.invalidateQueries` to keep UI in sync.

**shadcn/ui components**: Located in `src/components/ui/`. Add new components with `npx shadcn@latest add <component>`.

**Validation**: All API route POST/PATCH bodies are validated with Zod before touching the database. Auth inputs use Zod schemas in both client forms and server handlers.

**TypeScript path alias**: `@/*` maps to `src/*` (configured in `tsconfig.json`).

## Visa Status Enum

```typescript
enum VisaStatus {
  CITIZEN
  PERMANENT_RESIDENT
  WORK_VISA         // H1B, L1, O1, etc.
  STUDENT_VISA      // F1/OPT
  NO_AUTHORIZATION
}
```

## External Services

| Service | Purpose | Library |
|---------|---------|---------|
| Anthropic API | Cover letter generation | `@anthropic-ai/sdk` |
| JSearch (RapidAPI) | Job aggregation (multi-platform) | `fetch` |
| Reddit API | Job post scraping | `snoowrap` |
| Resend | Transactional email | `resend` |
| Google OAuth | Social login | NextAuth built-in provider |
| PostgreSQL | Primary database | `pg` + Prisma |
