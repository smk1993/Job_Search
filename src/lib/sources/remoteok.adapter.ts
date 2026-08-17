import { LRUCache } from "../cache";
import { detectUsAuthRequired } from "../work-auth-filter";
import type { NormalizedJob } from "./types";

const cache = new LRUCache<NormalizedJob[]>(100, 15 * 60 * 1000); // 15 min

interface RemoteOKJob {
  id?: string | number;
  slug?: string;
  company: string;
  position: string;
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
  url: string;
  date?: string;  // ISO date string
  epoch?: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function keywordMatch(job: NormalizedJob, terms: string[]): boolean {
  if (!terms.length) return true;
  const haystack = `${job.title} ${job.company} ${job.description} ${(job as unknown as { tags?: string[] }).tags?.join(" ") ?? ""}`.toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

export async function searchRemoteOK(rawQuery: string): Promise<NormalizedJob[]> {
  const terms = rawQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

  // RemoteOK supports tag-based filtering — use first keyword as tag
  const primaryTag = terms[0] ?? "";
  const cacheKey = `remoteok:${primaryTag}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return cached.filter((j) => keywordMatch(j, terms));
  }

  const url = primaryTag
    ? `https://remoteok.com/api?tags=${encodeURIComponent(primaryTag)}`
    : "https://remoteok.com/api";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "job-search-saas/1.0",
      "Accept": "application/json",
    },
  });

  if (!res.ok) throw new Error(`RemoteOK ${res.status}: ${res.statusText}`);
  const data = await res.json() as (RemoteOKJob | { legal?: string })[];

  // First element is always a legal/metadata object — skip it
  const rawJobs = data.slice(1) as RemoteOKJob[];

  const jobs: NormalizedJob[] = rawJobs
    .filter((job) => job.position && job.company && job.url)
    .map((job) => {
      const description = stripHtml(job.description ?? "");
      const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(`${job.position}\n${description}`);
      const salary =
        job.salary_min && job.salary_max
          ? `$${Number(job.salary_min).toLocaleString()} – $${Number(job.salary_max).toLocaleString()} /yr`
          : null;
      return {
        id: `remoteok_${job.slug ?? job.id ?? job.url}`,
        title: job.position,
        company: job.company,
        location: job.location || "Remote",
        description: description || job.position,
        jobType: "FULL_TIME" as const,
        workMode: "REMOTE" as const,
        sourceUrl: job.url.startsWith("http") ? job.url : `https://remoteok.com${job.url}`,
        sourcePlatform: "REMOTEOK",
        postedAt: job.epoch ? new Date(job.epoch * 1000) : job.date ? new Date(job.date) : null,
        salary,
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
    });

  cache.set(cacheKey, jobs);
  return jobs.filter((j) => keywordMatch(j, terms));
}
