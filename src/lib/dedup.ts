import type { NormalizedJob } from "./sources/types";

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(inc|llc|corp|ltd|limited|co|company|group|gmbh|plc|pty|technologies|tech|labs|solutions|services)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateDedupKey(title: string, company: string): string {
  return `${normalizeStr(company)}|${normalizeStr(title)}`;
}

function scoreCompleteness(job: NormalizedJob): number {
  let score = 0;
  if (job.salary) score += 3;
  if (job.salaryMin) score += 2;
  if (job.description.length > 500) score += 2;
  if (job.location) score += 1;
  if (job.jobType) score += 1;
  if (job.workMode) score += 1;
  if (job.postedAt) score += 1;
  return score;
}

function mergeJobs(primary: NormalizedJob, secondary: NormalizedJob): NormalizedJob {
  return {
    ...primary,
    salary: primary.salary ?? secondary.salary,
    salaryMin: primary.salaryMin ?? secondary.salaryMin,
    salaryMax: primary.salaryMax ?? secondary.salaryMax,
    location: primary.location ?? secondary.location,
    jobType: primary.jobType ?? secondary.jobType,
    workMode: primary.workMode ?? secondary.workMode,
    postedAt: primary.postedAt ?? secondary.postedAt,
  };
}

export function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seenUrls = new Set<string>();
  const byDedupKey = new Map<string, NormalizedJob>();

  for (const job of jobs) {
    // Level 1: exact URL dedup
    if (seenUrls.has(job.sourceUrl)) continue;
    seenUrls.add(job.sourceUrl);

    // Level 2: fuzzy title + company dedup
    const key = generateDedupKey(job.title, job.company);
    const existing = byDedupKey.get(key);
    if (existing) {
      const winner =
        scoreCompleteness(job) > scoreCompleteness(existing)
          ? mergeJobs(job, existing)
          : mergeJobs(existing, job);
      byDedupKey.set(key, winner);
    } else {
      byDedupKey.set(key, job);
    }
  }

  return Array.from(byDedupKey.values());
}

/** Filter jobs by seniority level using title heuristics */
export function filterBySeniority(
  jobs: NormalizedJob[],
  level: string | null
): NormalizedJob[] {
  if (!level || level === "mid") return jobs;

  const EXCLUDE_WHEN: Record<string, string[]> = {
    senior: ["junior", "jr.", "associate", "entry level", "entry-level", "intern", "graduate", "trainee"],
    junior: ["senior", "sr.", "lead", "principal", "staff", "director", "head of"],
    intern: ["senior", "lead", "principal", "staff", "director", "manager"],
    lead: ["junior", "jr.", "intern", "associate"],
    principal: ["junior", "jr.", "intern", "associate", "entry"],
  };

  const negativeTerms = EXCLUDE_WHEN[level] ?? [];
  if (!negativeTerms.length) return jobs;

  return jobs.filter((job) => {
    const title = job.title.toLowerCase();
    return !negativeTerms.some((term) => title.includes(term));
  });
}
