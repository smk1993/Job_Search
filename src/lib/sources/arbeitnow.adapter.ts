import { LRUCache } from "../cache";
import { detectUsAuthRequired } from "../work-auth-filter";
import type { NormalizedJob } from "./types";

const cache = new LRUCache<NormalizedJob[]>(100, 15 * 60 * 1000); // 15 min

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  location: string;
  created_at: number; // Unix timestamp
  tags?: string[];
  job_types?: string[];
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links?: { next?: string };
  meta?: { current_page: number; last_page: number };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mapJobType(types: string[]): NormalizedJob["jobType"] {
  const joined = types.join(" ").toLowerCase();
  if (joined.includes("part")) return "PART_TIME";
  if (joined.includes("contract")) return "CONTRACT";
  if (joined.includes("freelance")) return "FREELANCE";
  if (joined.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

function keywordMatch(job: NormalizedJob, terms: string[]): boolean {
  if (!terms.length) return true;
  const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

export async function searchArbeitnow(rawQuery: string): Promise<NormalizedJob[]> {
  const terms = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const cacheKey = `arbeitnow:${rawQuery.toLowerCase().trim()}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached.filter((j) => keywordMatch(j, terms));

  const url = new URL("https://www.arbeitnow.com/api/job-board-api");
  // Arbeitnow doesn't support free-text search — fetch page 1 and filter locally
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "job-search-saas/1.0" },
  });

  if (!res.ok) throw new Error(`Arbeitnow ${res.status}: ${res.statusText}`);
  const data = await res.json() as ArbeitnowResponse;

  const jobs: NormalizedJob[] = (data.data ?? [])
    .filter((job) => job.title && job.company_name && job.url)
    .map((job) => {
      const description = stripHtml(job.description ?? "");
      const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(`${job.title}\n${description}`);
      return {
        id: `arbeitnow_${job.slug}`,
        title: job.title,
        company: job.company_name,
        location: job.location || (job.remote ? "Remote" : null),
        description: description || job.title,
        jobType: mapJobType(job.job_types ?? []),
        workMode: job.remote ? ("REMOTE" as const) : ("ONSITE" as const),
        sourceUrl: job.url,
        sourcePlatform: "ARBEITNOW",
        postedAt: job.created_at ? new Date(job.created_at * 1000) : null,
        salary: null,
        salaryMin: null,
        salaryMax: null,
        requiresUsAuth,
        workAuthKeywords: matchedKeywords,
        isRedditPost: false,
        redditPostId: null,
        authorUsername: null,
        subreddit: null,
        contactEmail: null,
        contactLinkedin: null,
      };
    });

  cache.set(cacheKey, jobs);
  return jobs.filter((j) => keywordMatch(j, terms));
}
