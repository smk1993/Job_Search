import { LRUCache } from "../cache";
import { detectUsAuthRequired } from "../work-auth-filter";
import type { NormalizedJob } from "./types";

const cache = new LRUCache<NormalizedJob[]>(100, 15 * 60 * 1000); // 15 min

// Map country names to Adzuna country codes
const COUNTRY_CODE_MAP: Record<string, string> = {
  "united states": "us",
  "united kingdom": "gb",
  "germany": "de",
  "france": "fr",
  "canada": "ca",
  "australia": "au",
  "india": "in",
  "netherlands": "nl",
};

function countryToCode(country?: string): string {
  if (!country) return "us";
  return COUNTRY_CODE_MAP[country.toLowerCase()] ?? "us";
}

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
}

function mapJobType(contractTime?: string): NormalizedJob["jobType"] {
  const n = (contractTime ?? "").toLowerCase();
  if (n.includes("part")) return "PART_TIME";
  if (n.includes("contract")) return "CONTRACT";
  return "FULL_TIME";
}

function keywordMatch(job: NormalizedJob, terms: string[]): boolean {
  if (!terms.length) return true;
  const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

export async function searchAdzuna(rawQuery: string, country?: string): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const countryCode = countryToCode(country);
  const terms = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const cacheKey = `adzuna:${countryCode}:${rawQuery.toLowerCase().trim()}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("what", rawQuery.trim());
  url.searchParams.set("results_per_page", "20");
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "job-search-saas/1.0" },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      // Invalid API key — return empty rather than throw
      return [];
    }
    throw new Error(`Adzuna ${res.status}: ${res.statusText}`);
  }

  const data = await res.json() as { results?: AdzunaJob[] };

  const jobs: NormalizedJob[] = (data.results ?? []).map((job) => {
    const description = job.description ?? "";
    const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(`${job.title}\n${description}`);
    const salaryStr =
      job.salary_min && job.salary_max
        ? `${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`
        : null;

    return {
      id: `adzuna_${job.id}`,
      title: job.title,
      company: job.company?.display_name ?? "Unknown",
      location: job.location?.display_name ?? null,
      description,
      jobType: mapJobType(job.contract_time),
      workMode: null,
      sourceUrl: job.redirect_url,
      sourcePlatform: "ADZUNA",
      postedAt: job.created ? new Date(job.created) : null,
      salary: salaryStr,
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      requiresUsAuth,
      workAuthKeywords: matchedKeywords,
      isRedditPost: false,
      redditPostId: null,
      authorUsername: null,
      subreddit: null,
      contactEmail: null,
      contactLinkedin: null,
    };
  }).filter((j) => keywordMatch(j, terms));

  cache.set(cacheKey, jobs);
  return jobs;
}
