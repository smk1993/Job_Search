# Job Search SaaS - Multi-Source Integration & AI Search Plan

## Table of Contents

1. [New Job Sources](#1-new-job-sources)
2. [AI Query Parser](#2-ai-query-parser)
3. [Architecture](#3-architecture)
4. [Caching Strategy](#4-caching-strategy)
5. [Deduplication](#5-deduplication)
6. [Frontend UX](#6-frontend-ux)
7. [Implementation Phases](#7-implementation-phases)
8. [File Changes](#8-file-changes)

---

## 1. New Job Sources

### 1A. Free / No-Cost APIs (Priority: Implement First)

These require no Apify account and have zero or near-zero marginal cost per request.

#### Remotive (Remote Jobs)
- **Endpoint:** `https://remotive.com/api/remote-jobs`
- **Auth:** None required
- **Rate limit:** Undocumented but generous; add 1 req/sec self-throttle
- **Cost:** Free
- **Data returned:** title, company_name, category, url, publication_date, salary, candidate_required_location, description, job_type, tags
- **Category filter:** `?category=software-dev` (get valid list from `/api/remote-jobs/categories`)
- **Pagination:** `?limit=50` (returns all jobs by default; ~200-400 active at any time)
- **Pros:** Clean JSON, no auth, reliable, curated remote-only jobs
- **Cons:** Remote-only (by design), no keyword search -- must filter client-side. Must attribute "Remotive" with a backlink per TOS
- **Integration effort:** Low (1-2 hours)

#### RemoteOK
- **Endpoint:** `https://remoteok.com/api`
- **Auth:** None required
- **Rate limit:** Undocumented; self-throttle to 1 req/sec
- **Cost:** Free
- **Data returned:** JSON array with company, position, description, location, salary_min, salary_max, tags, url, date, logo
- **Pros:** No auth, good salary data, tags for filtering
- **Cons:** Remote-only, first element in array is a metadata object (must skip index 0), rate limiting not documented so needs conservative caching
- **Integration effort:** Low (1-2 hours)

#### Arbeitnow (EU + Remote Jobs)
- **Endpoint:** `https://www.arbeitnow.com/api/job-board-api`
- **Auth:** None required
- **Rate limit:** Generous; no documented hard limit
- **Cost:** Free
- **Data returned:** title, company_name, location, remote, url, created_at, description, tags, job_types
- **Pagination:** `?page=1` with standard pagination
- **Pros:** No auth, good EU coverage, includes remote flag, paginated
- **Cons:** EU-focused (good for diversity, but many users are US-focused)
- **Integration effort:** Low (1-2 hours)

#### Adzuna (Aggregated Job Ads)
- **Endpoint:** `https://api.adzuna.com/v1/api/jobs/{country}/search/{page}`
- **Auth:** `app_id` + `app_key` (free registration at developer.adzuna.com)
- **Rate limit:** ~1,000 calls/month on free tier (~33/day)
- **Cost:** Free tier; paid plans for higher volume
- **Data returned:** title, company, location, description, salary_min, salary_max, category, created, redirect_url, contract_time, contract_type
- **Coverage:** 16+ countries including US, UK, CA, AU, DE, FR, IN
- **Pros:** Real aggregated data from multiple boards, salary estimates, geographic breadth, well-documented API
- **Cons:** 1,000 calls/month is tight -- must cache aggressively. Requires registration
- **Integration effort:** Medium (2-3 hours, mostly around caching strategy to stay within limits)

#### The Muse
- **Endpoint:** `https://www.themuse.com/api/public/v2/jobs`
- **Auth:** `X-Muse-Api-Key` header (free registration)
- **Rate limit:** Undocumented; moderate volume expected
- **Cost:** Free
- **Data returned:** name (title), company.name, locations, publication_date, levels (seniority), categories, refs.landing_page, contents (HTML description)
- **Pros:** Curated quality listings, seniority levels included (rare), company profiles
- **Cons:** Smaller volume than Indeed/LinkedIn. HTML descriptions need sanitization. Requires API key registration
- **Integration effort:** Medium (2-3 hours)

#### USAJOBS (US Federal Government)
- **Endpoint:** `https://data.usajobs.gov/api/search`
- **Auth:** `Authorization-Key` header + `User-Agent` (free registration)
- **Rate limit:** Generous (designed for public access)
- **Cost:** Free
- **Data returned:** PositionTitle, OrganizationName, PositionLocation, QualificationSummary, PositionRemuneration (salary), PositionStartDate, ApplyURI
- **Pros:** Comprehensive federal job data, salary always included, visa sponsorship info often explicit
- **Cons:** Federal jobs only. XML-heavy legacy design. Niche audience
- **Integration effort:** Low-Medium (2 hours; response format is verbose but well-structured)

### 1B. Apify Actors (Priority: Phase 2)

Apify provides $5/month in free compute credits. At $0.20/CU (1 CU = 1 GB RAM x 1 hour), a lightweight scraper using 256 MB RAM gets ~20 hours of compute time per month for free.

#### Recommended Multi-Platform Actor

| Actor | ID | Cost | Platforms | Notes |
|-------|-----|------|-----------|-------|
| **All Jobs Scraper (39)** | `agentx/all-jobs-scraper` | Pay-per-event (~$0.40-0.80/1K jobs) | LinkedIn, Indeed, Glassdoor, ZipRecruiter + 35 more | Best value -- single actor covers all platforms. Unified 41-field schema. |
| LinkedIn Jobs Scraper | `bebity/linkedin-jobs-scraper` | $29.99/mo + usage | LinkedIn only | High quality but expensive monthly fee |
| Advanced LinkedIn Jobs | `curious_coder/linkedin-jobs-search-scraper` | Pay-per-event | LinkedIn only | Good for LinkedIn-specific deep scraping |
| Glassdoor Jobs Scraper | `curious_coder/glassdoor-jobs-scraper` | ~$0.30/1K jobs | Glassdoor only | Cheap per-result pricing |
| Glassdoor Jobs Scraper | `valig/glassdoor-jobs-scraper` | ~$0.40/1K jobs | Glassdoor only | Alternative option |
| Google Jobs Scraper | `orgupdate/google-jobs-scraper` | Pay-per-event | Google for Jobs (aggregates LinkedIn, Indeed, etc.) | Aggregator -- pulls from Google's own aggregation |

**Recommendation:** Start with `agentx/all-jobs-scraper` as it covers 39 platforms in a unified schema. This gives the best cost-to-coverage ratio. For users who need deeper LinkedIn data (recruiter info, company details), add `curious_coder/linkedin-jobs-search-scraper` as a secondary source.

#### Apify Integration Architecture

Apify actors are NOT real-time APIs. They run as background jobs (typical run time: 30 seconds to 5 minutes). The integration pattern must be:

1. **Scheduled background runs** (cron) -- not on-demand per user search
2. Store results in PostgreSQL via the existing `Job` model
3. User searches query the local DB, not Apify directly
4. Run Apify actors on a schedule (e.g., every 4-6 hours) for popular search terms

```
User Search --> PostgreSQL (pre-populated) --> Instant results
                    ^
                    |
        Cron Job (every 4-6h)
                    |
            Apify Actor Run --> Fetch dataset --> Upsert to DB
```

### 1C. Source Comparison Matrix

| Source | Cost | Speed | Coverage | Quality | Auth Required |
|--------|------|-------|----------|---------|---------------|
| JSearch (existing) | Paid (RapidAPI) | Real-time | US-heavy, multi-platform | High | API key |
| HN Jobs (existing) | Free | Real-time | Tech-only | Medium | None |
| Remotive | Free | Real-time | Remote-only | High | None |
| RemoteOK | Free | Real-time | Remote-only | Medium | None |
| Arbeitnow | Free | Real-time | EU + Remote | Medium | None |
| Adzuna | Free (1K/mo) | Real-time | 16 countries | High | API key |
| The Muse | Free | Real-time | US-heavy | High | API key |
| USAJOBS | Free | Real-time | US Federal | High | API key |
| Apify (All Jobs) | ~$0.50/1K | Background | 39 platforms | High | API key |

---

## 2. AI Query Parser

### Overview

Use the existing Anthropic Claude SDK (`@anthropic-ai/sdk`, already in `package.json`) to parse natural language job search queries into structured search parameters. This runs server-side before dispatching searches to multiple sources.

### Input/Output Contract

**Input:** `"senior react job that doesn't need green card in New York, preferably remote"`

**Output (structured):**
```typescript
interface ParsedSearchQuery {
  // Core search
  keywords: string[];          // ["react"]
  jobTitle: string | null;     // "React Developer" / "React Engineer"
  rawQuery: string;            // original user input, always preserved

  // Filters
  seniorityLevel: "intern" | "junior" | "mid" | "senior" | "lead" | "principal" | "executive" | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  location: string | null;     // "New York"

  // Work authorization
  requiresNoSponsorship: boolean;  // true = user wants jobs that DON'T need sponsorship
  sponsorsVisa: boolean;           // true = user wants jobs that DO sponsor visas

  // Salary
  salaryMin: number | null;        // in annual USD
  salaryMax: number | null;

  // Company preferences
  companyName: string | null;
  excludeCompanies: string[];

  // Confidence
  confidence: number;             // 0-1, how confident the parser is in its interpretation
  interpretation: string;         // human-readable summary: "Looking for senior React roles in NYC, remote preferred, no sponsorship needed"
}
```

### Implementation: System Prompt

```typescript
const QUERY_PARSER_SYSTEM = `You are a job search query parser. Given a natural language job search query, extract structured search parameters.

RULES:
1. Always preserve the user's intent. If uncertain about a field, set it to null rather than guessing.
2. For keywords, extract the core technical skills and role identifiers (e.g., "react", "python", "data engineer").
3. For jobTitle, generate the most likely formal job title (e.g., "Senior React Developer").
4. Seniority: map phrases like "senior", "lead", "entry level", "experienced", "junior" to the enum values.
5. Work authorization:
   - "doesn't need green card" / "no sponsorship required" → requiresNoSponsorship: true
   - "sponsors visa" / "h1b friendly" → sponsorsVisa: true
6. Location: extract city, state, or country. "Bay Area" → "San Francisco Bay Area". "NYC" → "New York".
7. Salary: parse "$150k" as 150000, "150-200k" as min=150000, max=200000.
8. Return interpretation as a concise natural-language summary of what you understood.

Respond with ONLY valid JSON matching the ParsedSearchQuery schema. No markdown, no explanation.`;
```

### Claude Model Selection

Use `claude-sonnet-4-6` (same as cover letters) for query parsing. This is fast enough for interactive use (~200-500ms for short prompts) and accurate enough for structured extraction.

**Do NOT use `claude-opus-4-6`** for this -- it is slower and the task does not require deep reasoning.

### Latency Budget

The AI parser sits in the critical path of every search. Target latency: under 500ms.

Optimizations:
1. **Use `max_tokens: 512`** -- structured output is small
2. **Cache parsed queries** -- identical queries should not re-invoke Claude
3. **Non-blocking on failure** -- if Claude times out or errors, fall back to raw keyword search (the current behavior). The AI parser is an enhancement, not a requirement
4. **Stream the parse** -- not needed; the JSON is small enough to wait for the full response

### Caching Parsed Queries

```typescript
// In-memory LRU cache for parsed queries
// Key: normalized lowercase query string
// Value: ParsedSearchQuery
// TTL: 1 hour (query interpretation doesn't change)
// Max entries: 500
```

This avoids repeated Claude API calls for common queries like "react developer remote" that many users will type.

### Fallback Behavior

If the AI parser fails (timeout, rate limit, error), degrade gracefully:

```
1. Use raw query as keywords
2. Check for obvious patterns with regex:
   - "remote" → workMode: REMOTE
   - "senior" → seniorityLevel: senior
   - Location detection via simple city/state list
3. Proceed with search using these basic extractions
```

---

## 3. Architecture

### Current Flow

```
User types query
    → 500ms debounce (useDebounce hook)
    → GET /api/jobs/search?q=...
    → Server: JSearch API call + HN cache lookup (parallel)
    → Server: combine + filter work auth
    → JSON response
    → React Query caches on client (10 min stale time)
```

### Proposed Flow: Multi-Source with AI Parsing

```
User types query
    → 300ms debounce (reduce from 500ms for snappier feel)
    → POST /api/jobs/search  (switch to POST for structured body)
    → Server: AI Query Parser (Claude) → ParsedSearchQuery
         |
         ├─ Cache hit? Return cached parse instantly
         └─ Cache miss? Claude call (~300-500ms)
         |
    → Parallel fetch from ALL enabled sources:
         |
         ├─ [1] PostgreSQL (Apify-populated jobs) ─── instant (<50ms)
         ├─ [2] JSearch API ────────────────────── ~200-800ms
         ├─ [3] Remotive API ───────────────────── ~100-300ms
         ├─ [4] RemoteOK API ──────────────────── ~100-300ms
         ├─ [5] Arbeitnow API ─────────────────── ~100-300ms
         ├─ [6] Adzuna API (if budget allows) ──── ~200-500ms
         ├─ [7] The Muse API ──────────────────── ~200-500ms
         ├─ [8] HN Jobs (from cache) ──────────── instant (<10ms)
         └─ [9] USAJOBS API ──────────────────── ~200-500ms
         |
    → Merge results
    → Deduplicate
    → Apply work auth filter
    → Apply seniority/location/salary filters from ParsedSearchQuery
    → Sort by relevance (boost exact matches on parsed fields)
    → Stream response as NDJSON (or return full JSON for simplicity)
```

### Source Adapter Interface

Every job source implements a common adapter interface:

```typescript
interface JobSourceAdapter {
  readonly name: string;                    // "remotive", "adzuna", etc.
  readonly platform: SourcePlatform;        // enum value for DB
  readonly isRealTime: boolean;             // true = called per search; false = background-populated

  search(params: NormalizedSearchParams): Promise<NormalizedJob[]>;

  // Optional: health check
  healthCheck?(): Promise<boolean>;
}

interface NormalizedSearchParams {
  keywords: string[];
  jobTitle: string | null;
  location: string | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | null;
  page: number;
  limit: number;
}

interface NormalizedJob {
  title: string;
  company: string;
  location: string | null;
  description: string;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  sourceUrl: string;                // unique identifier for dedup
  sourcePlatform: string;
  postedAt: Date | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];

  // Metadata for ranking
  relevanceSignals: {
    titleMatch: boolean;            // does title match parsed jobTitle?
    locationMatch: boolean;         // does location match parsed location?
    seniorityMatch: boolean;        // does seniority match parsed level?
  };
}
```

### Parallel Fetching with Timeout

```typescript
async function searchAllSources(
  params: NormalizedSearchParams,
  enabledSources: JobSourceAdapter[],
  timeoutMs: number = 3000
): Promise<{ results: NormalizedJob[]; errors: SourceError[] }> {
  const results: NormalizedJob[] = [];
  const errors: SourceError[] = [];

  const settled = await Promise.allSettled(
    enabledSources.map(async (source) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const jobs = await source.search(params);
        return { source: source.name, jobs };
      } catch (err) {
        errors.push({ source: source.name, error: String(err) });
        return { source: source.name, jobs: [] };
      } finally {
        clearTimeout(timer);
      }
    })
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(...result.value.jobs);
    }
  }

  return { results, errors };
}
```

Key design decisions:

1. **3-second global timeout per source** -- if any source takes longer, skip it. The user should never wait more than ~3.5 seconds total (including AI parsing).
2. **`Promise.allSettled`** -- never let one failing source block the others.
3. **Error collection** -- log which sources failed so we can monitor health.
4. **Source-level circuit breaker** (Phase 3) -- if a source fails 3x in a row, disable it for 5 minutes.

### Source Registry Pattern

```typescript
// src/lib/sources/registry.ts
const sourceRegistry: JobSourceAdapter[] = [
  new PostgresSourceAdapter(),    // always enabled, always first
  new JSearchAdapter(),           // existing, paid
  new RemotiveAdapter(),          // free
  new RemoteOKAdapter(),          // free
  new ArbeitnowAdapter(),        // free
  new HackerNewsAdapter(),        // existing, free
  // Phase 2:
  // new AdzunaAdapter(),
  // new TheMuseAdapter(),
  // new USAJobsAdapter(),
];
```

---

## 4. Caching Strategy

### Multi-Level Cache Architecture

```
Level 1: React Query (client)
    ↓ miss
Level 2: In-Memory Map (server process)
    ↓ miss
Level 3: PostgreSQL (persisted jobs from Apify + cached API results)
    ↓ miss
Level 4: External API call
    ↓ result
    → Write back to L3 (DB) + L2 (memory)
```

### TTLs by Source

| Source | Memory Cache (L2) | DB Cache (L3) | Client Cache (L1) | Rationale |
|--------|-------------------|---------------|-------------------|-----------|
| JSearch | 10 min | 24 hours | 10 min | Paid API -- minimize calls |
| HN Jobs | 30 min | N/A (ephemeral) | 5 min | Already cached at source level |
| Remotive | 15 min | 6 hours | 5 min | Free but respectful rate limits |
| RemoteOK | 15 min | 6 hours | 5 min | Free but undocumented limits |
| Arbeitnow | 15 min | 6 hours | 5 min | Free, generous |
| Adzuna | 30 min | 24 hours | 10 min | Strict 1K/month limit |
| The Muse | 20 min | 12 hours | 10 min | Free but moderate volume |
| USAJOBS | 30 min | 24 hours | 10 min | Generous but low-frequency updates |
| Apify (DB) | N/A | Permanent (until stale) | 10 min | Background-populated |
| AI Query Parse | 60 min | N/A | N/A | Interpretation doesn't change |

### Memory Cache Implementation

The existing `Map`-based cache in `jsearch.ts` works but has limitations:
- No LRU eviction (only evicts oldest entry, not least-recently-used)
- No TTL sweep (expired entries stay in map until overwritten)
- Per-module (each source file has its own cache)

**Proposed improvement:** A shared cache utility:

```typescript
// src/lib/cache.ts
class LRUCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private maxEntries: number,
    private defaultTTL: number  // ms
  ) {}

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (LRU refresh) -- Map maintains insertion order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict the least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }
}
```

### DB-Level Caching (Persisting API Results)

When external APIs return results, persist them to the `Job` table. This provides:

1. **Instant results for repeat queries** -- search PostgreSQL first, return DB jobs immediately
2. **Offline resilience** -- if an API goes down, stale-but-valid jobs still show
3. **Deduplication base** -- DB is the canonical source for "have we seen this job before?"
4. **Analytics** -- track which sources produce the most/best jobs

New fields needed on Job model:
```prisma
model Job {
  // ... existing fields ...

  lastSeenAt    DateTime  @default(now())  // updated each time we re-fetch this job
  expiresAt     DateTime?                  // when the job listing is expected to expire
  searchQueries String[]                   // which search queries led to this job

  @@index([title, company])               // for dedup lookup
  @@index([lastSeenAt])                   // for staleness queries
}
```

### Stale-While-Revalidate Pattern

For the search API route:

1. **Immediate:** Return jobs from PostgreSQL that match the query (sub-50ms)
2. **Background:** Fire off API calls to all enabled sources
3. **On completion:** Upsert new results to DB, send update to client via response

This means the first response is always fast (from DB), and fresh data arrives shortly after. The frontend can show "Refreshing from 6 sources..." while background fetches complete.

---

## 5. Deduplication

### The Problem

The same job posting appears on multiple platforms. A "Senior React Developer at Stripe" listing might appear on:
- LinkedIn (via JSearch)
- Indeed (via JSearch)
- Glassdoor (via Apify)
- The company's own careers page (via Google Jobs)

These will have different `sourceUrl` values but represent the same job.

### Deduplication Strategy (3 Levels)

#### Level 1: Exact URL Match
- The `sourceUrl` field is already `@unique` in the schema
- If two results share the same URL, they are the same job. Keep the most recent one
- This catches: same source returning the same job twice

#### Level 2: Fuzzy Title + Company Match
- Normalize: lowercase, strip punctuation, remove common suffixes ("Inc", "LLC", "Corp", "Ltd")
- Generate a dedup key: `normalize(company) + "|" + normalize(title)`
- If two jobs share the same dedup key AND were posted within 7 days of each other, they are likely the same job
- Keep the one with: (a) more complete data (description length, salary present), then (b) most recent `postedAt`

```typescript
function generateDedupKey(title: string, company: string): string {
  const normalizeStr = (s: string) =>
    s.toLowerCase()
     .replace(/[^\w\s]/g, "")
     .replace(/\b(inc|llc|corp|ltd|limited|co|company|group|gmbh)\b/g, "")
     .replace(/\s+/g, " ")
     .trim();
  return `${normalizeStr(company)}|${normalizeStr(title)}`;
}
```

#### Level 3: Description Similarity (Phase 3)
- For jobs with the same dedup key but different URLs, compare descriptions
- Use simple Jaccard similarity on word sets (no external ML needed):
  ```
  similarity = |intersection(wordsA, wordsB)| / |union(wordsA, wordsB)|
  ```
- If similarity > 0.6, treat as duplicate
- This catches: slightly different titles ("Sr. React Dev" vs "Senior React Developer") at the same company

### Dedup in Practice

When merging results from multiple sources:

```typescript
function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Map<string, NormalizedJob>();   // dedupKey → best job
  const seenUrls = new Set<string>();

  for (const job of jobs) {
    // Level 1: exact URL
    if (seenUrls.has(job.sourceUrl)) continue;
    seenUrls.add(job.sourceUrl);

    // Level 2: fuzzy title+company
    const key = generateDedupKey(job.title, job.company);
    const existing = seen.get(key);
    if (existing) {
      // Keep the one with more data
      if (scoreCompleteness(job) > scoreCompleteness(existing)) {
        seen.set(key, mergeJobData(existing, job));
      } else {
        seen.set(key, mergeJobData(job, existing));
      }
    } else {
      seen.set(key, job);
    }
  }

  return Array.from(seen.values());
}

function scoreCompleteness(job: NormalizedJob): number {
  let score = 0;
  if (job.salary) score += 3;              // salary is high-value
  if (job.salaryMin) score += 2;
  if (job.description.length > 500) score += 2;
  if (job.location) score += 1;
  if (job.jobType) score += 1;
  if (job.workMode) score += 1;
  if (job.postedAt) score += 1;
  return score;
}

// Merge: keep primary job's core fields, but fill in nulls from secondary
function mergeJobData(primary: NormalizedJob, secondary: NormalizedJob): NormalizedJob {
  return {
    ...primary,
    salary: primary.salary ?? secondary.salary,
    salaryMin: primary.salaryMin ?? secondary.salaryMin,
    salaryMax: primary.salaryMax ?? secondary.salaryMax,
    location: primary.location ?? secondary.location,
    jobType: primary.jobType ?? secondary.jobType,
    workMode: primary.workMode ?? secondary.workMode,
    // Track all sources this job was found on
    sourcePlatform: primary.sourcePlatform,  // keep primary's platform
  };
}
```

### Storing Multi-Source Info

Add a `sourceUrls` field (JSON or string array) to track all URLs where a job was found. This allows showing "Found on LinkedIn, Indeed, Glassdoor" badges.

---

## 6. Frontend UX

### 6A. AI Query Interpretation Display

When the user types a natural language query, show the AI's interpretation above the results:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 "senior react job that doesn't need green card in NYC"       │
├─────────────────────────────────────────────────────────────────┤
│ Understanding: Senior React Developer roles in New York City,   │
│ excluding jobs that require US work authorization               │
│                                                                 │
│ [React] [Senior] [New York] [No Sponsorship Needed] [Edit]     │
└─────────────────────────────────────────────────────────────────┘
```

Implementation:
- Show a subtle card below the search bar with the `interpretation` string
- Render extracted filters as editable pill/badge components
- Clicking a pill removes that filter; clicking "Edit" opens a structured filter panel
- If `confidence < 0.7`, show a warning: "I wasn't sure about some parts of your query. Please check the filters."

### 6B. Progressive Results Loading

Instead of waiting for ALL sources to return before showing anything:

**Option A: Staggered rendering (Recommended for Phase 1)**
- Return all results in a single JSON response (simpler)
- But order by source speed: DB results first, then cached results, then API results
- Show a "Searching 6 sources..." indicator with checkmarks as sources complete
- Use React Query's `placeholderData` (already implemented) to keep old results visible

**Option B: Streaming results (Phase 3)**
- Use Server-Sent Events (SSE) or NDJSON streaming
- Each source sends its results as they arrive
- Frontend appends results into the existing grid
- More complex but gives the fastest perceived performance

For Phase 1, Option A is sufficient. The parallel fetch with 3s timeout means worst-case is ~3.5 seconds for all results.

### 6C. Source Badges

Each job card should show which platform it came from:

```typescript
const SOURCE_BADGES: Record<string, { label: string; color: string; icon?: string }> = {
  LINKEDIN:     { label: "LinkedIn",     color: "bg-blue-100 text-blue-800" },
  INDEED:       { label: "Indeed",       color: "bg-purple-100 text-purple-800" },
  GLASSDOOR:    { label: "Glassdoor",    color: "bg-green-100 text-green-800" },
  ZIPRECRUITER: { label: "ZipRecruiter", color: "bg-teal-100 text-teal-800" },
  REMOTIVE:     { label: "Remotive",     color: "bg-indigo-100 text-indigo-800" },
  REMOTEOK:     { label: "RemoteOK",     color: "bg-emerald-100 text-emerald-800" },
  ARBEITNOW:    { label: "Arbeitnow",    color: "bg-amber-100 text-amber-800" },
  ADZUNA:       { label: "Adzuna",       color: "bg-cyan-100 text-cyan-800" },
  THEMUSE:      { label: "The Muse",     color: "bg-rose-100 text-rose-800" },
  USAJOBS:      { label: "USAJobs",      color: "bg-red-100 text-red-800" },
  HACKERNEWS:   { label: "Hacker News",  color: "bg-orange-100 text-orange-800" },
  OTHER:        { label: "Other",        color: "bg-gray-100 text-gray-800" },
};
```

Show a small badge on each `JobCard` in the top-right corner. If a job was found on multiple sources, show a stacked badge: "LinkedIn +2".

### 6D. Search Results Summary Bar

Above the results grid, show:

```
Found 47 jobs from 6 sources in 1.2s
[LinkedIn: 12] [Indeed: 8] [Remotive: 6] [RemoteOK: 5] [Arbeitnow: 4] [HN: 2] [+10 from DB]
```

This gives the user confidence that the search is comprehensive.

### 6E. Source Toggle Panel

Allow users to enable/disable specific sources in their settings or inline:

```
Sources: [x] JSearch  [x] Remotive  [x] RemoteOK  [x] Arbeitnow  [ ] HN Jobs
```

Store preferences in user settings (existing `User` model) or localStorage.

### 6F. Reduced Debounce

Lower the debounce from 500ms to 300ms. The current 500ms delay is noticeable. With caching at multiple levels, the cost of slightly more frequent requests is negligible.

---

## 7. Implementation Phases

### Phase 1: Free API Sources + AI Parser (Week 1-2)

**Goal:** Triple the number of job sources with zero additional cost. Add AI-powered query understanding.

1. Create the source adapter interface and registry (`src/lib/sources/`)
2. Implement adapters for Remotive, RemoteOK, Arbeitnow
3. Refactor existing JSearch and HN adapters to use the new interface
4. Implement the AI Query Parser using Claude
5. Update `/api/jobs/search` to use parallel multi-source fetching
6. Add deduplication (Levels 1 + 2)
7. Update the shared cache utility (`src/lib/cache.ts`)
8. Add source badges to `JobCard` component
9. Add AI interpretation display to the search page
10. Update `SourcePlatform` enum in Prisma schema

**Expected outcome:** 5 sources (JSearch, HN, Remotive, RemoteOK, Arbeitnow) running in parallel. AI understands natural language queries. Results feel faster due to parallel fetching.

### Phase 2: Paid API Sources + DB Caching (Week 3-4)

**Goal:** Add higher-quality sources. Persist results to PostgreSQL for instant repeat queries.

1. Register for Adzuna, The Muse, USAJOBS API keys
2. Implement adapters for Adzuna, The Muse, USAJOBS
3. Add DB-level caching: upsert all API results into the `Job` table
4. Implement stale-while-revalidate: return DB results immediately, refresh in background
5. Add `lastSeenAt`, `expiresAt`, `searchQueries` fields to Job model
6. Add PostgreSQL full-text search index for faster local queries
7. Implement source health monitoring (log failures, success rates)
8. Add source toggle panel in settings or search page

**Expected outcome:** 8 sources total. Repeat searches return instantly from DB. Source reliability is monitored.

### Phase 3: Apify Integration + Streaming (Week 5-6)

**Goal:** Add scraped data from LinkedIn/Glassdoor/ZipRecruiter via Apify. Implement streaming results for the best UX.

1. Set up Apify account and configure `agentx/all-jobs-scraper`
2. Build a background job runner (cron or Vercel Cron) to run Apify actors on a schedule
3. Build the Apify dataset ingestion pipeline (fetch results, normalize, upsert to DB)
4. Configure scheduled runs for top 20 search terms (based on user analytics)
5. Implement SSE/NDJSON streaming for progressive result delivery
6. Add description-based deduplication (Level 3 - Jaccard similarity)
7. Implement circuit breaker pattern for source resilience
8. Add search analytics: track popular queries, source hit rates, user engagement

**Expected outcome:** 39+ platforms via Apify. Streaming results. Production-grade resilience.

### Phase 4: Advanced Features (Week 7-8)

**Goal:** Polish and optimize.

1. AI-powered job ranking: use Claude to score job-candidate fit based on user profile
2. Saved search alerts: notify users when new jobs match their saved queries
3. Source quality scoring: automatically rank sources by data completeness
4. Rate limit dashboard: monitor API usage across all paid sources
5. A/B test debounce timing (200ms vs 300ms vs 400ms)
6. Add PostgreSQL trigram index (`pg_trgm`) for fuzzy text search
7. Consider Redis for shared cache if deploying multiple server instances

---

## 8. File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/lib/cache.ts` | Shared LRU cache utility used by all source adapters |
| `src/lib/ai-query-parser.ts` | Claude-powered natural language query parser |
| `src/lib/dedup.ts` | Job deduplication logic (normalize, compare, merge) |
| `src/lib/sources/types.ts` | `JobSourceAdapter`, `NormalizedJob`, `NormalizedSearchParams` interfaces |
| `src/lib/sources/registry.ts` | Source registry: list of all enabled adapters, parallel fetch orchestrator |
| `src/lib/sources/jsearch.adapter.ts` | JSearch adapter (refactored from `jsearch.ts`) |
| `src/lib/sources/hackernews.adapter.ts` | HN adapter (refactored from `reddit.ts`) |
| `src/lib/sources/remotive.adapter.ts` | Remotive API adapter |
| `src/lib/sources/remoteok.adapter.ts` | RemoteOK API adapter |
| `src/lib/sources/arbeitnow.adapter.ts` | Arbeitnow API adapter |
| `src/lib/sources/adzuna.adapter.ts` | Adzuna API adapter (Phase 2) |
| `src/lib/sources/themuse.adapter.ts` | The Muse API adapter (Phase 2) |
| `src/lib/sources/usajobs.adapter.ts` | USAJOBS API adapter (Phase 2) |
| `src/lib/sources/postgres.adapter.ts` | PostgreSQL local search adapter (Phase 2) |
| `src/lib/sources/apify.adapter.ts` | Apify background job runner + dataset ingestion (Phase 3) |
| `src/components/jobs/SourceBadge.tsx` | Source platform badge component |
| `src/components/jobs/AIQueryInterpretation.tsx` | AI interpretation display component |
| `src/components/jobs/SearchSummaryBar.tsx` | "47 jobs from 6 sources in 1.2s" component |
| `src/components/jobs/SourceToggle.tsx` | Enable/disable sources inline panel |
| `src/app/api/jobs/search-v2/route.ts` | New search endpoint with multi-source + AI parsing (can replace old route once stable) |
| `src/app/api/cron/apify-ingest/route.ts` | Cron endpoint for Apify dataset ingestion (Phase 3) |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add new `SourcePlatform` enum values (`REMOTIVE`, `REMOTEOK`, `ARBEITNOW`, `ADZUNA`, `THEMUSE`, `USAJOBS`, `HACKERNEWS`). Add `lastSeenAt`, `expiresAt`, `searchQueries` fields to `Job`. Add full-text search index. |
| `src/types/job.ts` | Add `sources: string[]` field (multi-source tracking). Add `aiInterpretation` field. |
| `src/hooks/useJobs.ts` | Update to POST method. Add `parsedQuery` to response type. Reduce stale time for sources with fast caches. |
| `src/hooks/useDebounce.ts` | Change default delay from 500 to 300. |
| `src/app/(dashboard)/jobs/page.tsx` | Add `AIQueryInterpretation` component. Add `SourceBadge` to cards. Add `SearchSummaryBar`. Replace HN toggle with full source toggle. |
| `src/components/jobs/JobCard.tsx` | Add `SourceBadge` in card header. Show "Found on X sources" if multi-source. |
| `src/lib/jsearch.ts` | Refactor to use shared `LRUCache`. Extract adapter logic to `sources/jsearch.adapter.ts`. Keep this file as a thin re-export for backward compatibility. |
| `src/lib/reddit.ts` | Refactor to use shared `LRUCache`. Extract adapter logic to `sources/hackernews.adapter.ts`. |
| `src/lib/anthropic.ts` | Add `parseSearchQuery()` export alongside existing `generateCoverLetter()`. Or keep separate in `ai-query-parser.ts` (recommended for single-responsibility). |
| `package.json` | No new dependencies needed for Phase 1. Phase 3: add `apify-client` package. |
| `.env` | Add `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `THEMUSE_API_KEY`, `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT`, `APIFY_TOKEN` (as needed per phase). |

### Files That Should NOT Change

| File | Reason |
|------|--------|
| `src/lib/work-auth-filter.ts` | Already well-designed. The dedup/merge layer will call `detectUsAuthRequired` on normalized descriptions. No changes needed. |
| `src/lib/auth.ts` | Auth is orthogonal to search. |
| `src/lib/prisma.ts` | Prisma client singleton is fine as-is. |
| `src/app/api/jobs/save/route.ts` | Save logic is independent. |
| `src/app/api/jobs/saved/route.ts` | Saved jobs query is independent. |

---

## Appendix A: Environment Variables

```env
# Existing
RAPIDAPI_KEY=...
ANTHROPIC_API_KEY=...

# Phase 2
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
THEMUSE_API_KEY=...
USAJOBS_API_KEY=...
USAJOBS_USER_AGENT=your-email@example.com

# Phase 3
APIFY_TOKEN=...
```

## Appendix B: Apify Actor Configuration

For `agentx/all-jobs-scraper`, the input schema expects:

```json
{
  "searchQueries": ["react developer", "python engineer"],
  "location": "United States",
  "maxResults": 100,
  "dateSincePosted": "week",
  "platforms": ["linkedin", "indeed", "glassdoor", "ziprecruiter"]
}
```

Schedule via Apify's built-in scheduler or Vercel Cron:
- Every 6 hours for top 10 search terms
- Every 12 hours for top 11-20 search terms
- Track "top search terms" from user query analytics

## Appendix C: Cost Estimate (Monthly)

| Source | Monthly Cost | Volume |
|--------|-------------|--------|
| JSearch (RapidAPI) | Existing plan | Existing usage |
| Remotive | $0 | Unlimited |
| RemoteOK | $0 | Unlimited |
| Arbeitnow | $0 | Unlimited |
| HN Jobs | $0 | Unlimited |
| Adzuna | $0 (free tier) | 1,000 calls/month |
| The Muse | $0 (free tier) | Moderate |
| USAJOBS | $0 | Unlimited |
| Apify | $0-5 (free tier) | ~5,000-10,000 jobs/month |
| Claude (AI Parser) | ~$2-5/month | ~3,000-5,000 parse calls (most cached) |
| **Total additional** | **~$2-10/month** | |

## Appendix D: Sources

- [Apify All Jobs Scraper](https://apify.com/agentx/all-jobs-scraper)
- [Apify LinkedIn Jobs Scraper (bebity)](https://apify.com/bebity/linkedin-jobs-scraper)
- [Apify Glassdoor Jobs Scraper](https://apify.com/curious_coder/glassdoor-jobs-scraper)
- [Apify Google Jobs Scraper](https://apify.com/orgupdate/google-jobs-scraper)
- [Apify Free Plan Details](https://use-apify.com/docs/what-is-apify/apify-free-plan)
- [Remotive API](https://remotive.com/remote-jobs/api)
- [RemoteOK API](https://www.freepublicapis.com/remote-ok-jobs-api)
- [Arbeitnow API](https://www.arbeitnow.com/blog/job-board-api)
- [Adzuna Developer Portal](https://developer.adzuna.com/)
- [The Muse API v2](https://www.themuse.com/developers/api/v2)
- [Free Jobs APIs Compared (2026)](https://jobspipe.dev/free-jobs-api)
- [PublicAPIs.io - Jobs Category](https://publicapis.io/category/jobs)
