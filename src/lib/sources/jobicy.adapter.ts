import { LRUCache } from "../cache";
import { detectUsAuthRequired } from "../work-auth-filter";
import type { NormalizedJob } from "./types";

const cache = new LRUCache<NormalizedJob[]>(100, 15 * 60 * 1000); // 15 min

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobDescription: string;
  pubDate: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
  jobType?: string;
}

function mapJobType(jobType?: string): NormalizedJob["jobType"] {
  const n = (jobType ?? "").toLowerCase();
  if (n.includes("part")) return "PART_TIME";
  if (n.includes("contract") || n.includes("freelance")) return "CONTRACT";
  if (n.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function keywordMatch(job: NormalizedJob, terms: string[]): boolean {
  if (!terms.length) return true;
  const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

export async function searchJobicy(rawQuery: string): Promise<NormalizedJob[]> {
  const terms = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const cacheKey = `jobicy:${rawQuery.toLowerCase().trim()}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = new URL("https://jobicy.com/api/v2/remote-jobs");
  url.searchParams.set("count", "50");
  url.searchParams.set("tag", rawQuery.trim().split(/\s+/).slice(0, 2).join(","));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "job-search-saas/1.0" },
  });

  if (!res.ok) throw new Error(`Jobicy ${res.status}: ${res.statusText}`);

  const data = await res.json() as { jobs?: JobicyJob[] };

  const jobs: NormalizedJob[] = (data.jobs ?? []).map((job) => {
    const description = stripHtml(job.jobDescription ?? "");
    const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(`${job.jobTitle}\n${description}`);

    const salaryStr =
      job.annualSalaryMin && job.annualSalaryMax
        ? `${job.salaryCurrency ?? ""}${job.annualSalaryMin.toLocaleString()} – ${job.annualSalaryMax.toLocaleString()} yearly`
        : null;

    return {
      id: `jobicy_${job.id}`,
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo || "Remote",
      description,
      jobType: mapJobType(job.jobType),
      workMode: "REMOTE" as const,
      sourceUrl: job.url,
      sourcePlatform: "JOBICY",
      postedAt: job.pubDate ? new Date(job.pubDate) : null,
      salary: salaryStr,
      salaryMin: job.annualSalaryMin ?? null,
      salaryMax: job.annualSalaryMax ?? null,
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
