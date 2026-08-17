import { LRUCache } from "../cache";
import { detectUsAuthRequired } from "../work-auth-filter";
import type { NormalizedJob } from "./types";

const cache = new LRUCache<NormalizedJob[]>(100, 15 * 60 * 1000); // 15 min

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mapJobType(t: string): NormalizedJob["jobType"] {
  const n = (t || "").toLowerCase();
  if (n.includes("part")) return "PART_TIME";
  if (n.includes("contract")) return "CONTRACT";
  if (n.includes("freelance")) return "FREELANCE";
  if (n.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

function keywordMatch(job: NormalizedJob, terms: string[]): boolean {
  if (!terms.length) return true;
  const haystack = `${job.title} ${job.company} ${job.description}`.toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

export async function searchRemotive(rawQuery: string): Promise<NormalizedJob[]> {
  const terms = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const cacheKey = `remotive:${rawQuery.toLowerCase().trim()}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("search", rawQuery.trim());
  url.searchParams.set("limit", "50");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "job-search-saas/1.0" },
  });

  if (!res.ok) throw new Error(`Remotive ${res.status}: ${res.statusText}`);
  const data = await res.json() as { jobs?: RemotiveJob[] };
  const jobs: NormalizedJob[] = (data.jobs ?? []).map((job) => {
    const description = stripHtml(job.description);
    const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(`${job.title}\n${description}`);
    return {
      id: `remotive_${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || "Remote",
      description,
      jobType: mapJobType(job.job_type),
      workMode: "REMOTE" as const,
      sourceUrl: job.url,
      sourcePlatform: "REMOTIVE",
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
      salary: job.salary || null,
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
  }).filter((j) => keywordMatch(j, terms));

  cache.set(cacheKey, jobs);
  return jobs;
}
