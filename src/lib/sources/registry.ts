import { searchRemotive } from "./remotive.adapter";
import { searchRemoteOK } from "./remoteok.adapter";
import { searchArbeitnow } from "./arbeitnow.adapter";
import { deduplicateJobs, filterBySeniority } from "../dedup";
import type { NormalizedJob, SearchResult } from "./types";
import type { ParsedSearchQuery } from "../ai-query-parser";

const SOURCE_TIMEOUT_MS = 5_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

const FREE_SOURCES: { name: string; fn: (q: string) => Promise<NormalizedJob[]> }[] = [
  { name: "REMOTIVE", fn: searchRemotive },
  { name: "REMOTEOK", fn: searchRemoteOK },
  { name: "ARBEITNOW", fn: searchArbeitnow },
];

export interface RegistryResult {
  jobs: NormalizedJob[];
  sourceResults: SearchResult[];
}

/**
 * Fetches all free job sources in parallel with per-source timeouts,
 * then deduplicates and optionally filters by seniority level.
 */
export async function fetchFromFreeSourcesRegistry(
  rawQuery: string,
  parsed?: ParsedSearchQuery
): Promise<RegistryResult> {
  const settled = await Promise.allSettled(
    FREE_SOURCES.map(async ({ name, fn }) => {
      const t = Date.now();
      const jobs = await withTimeout(fn(rawQuery), SOURCE_TIMEOUT_MS, name);
      return { sourceName: name, jobs, durationMs: Date.now() - t } satisfies SearchResult;
    })
  );

  const sourceResults: SearchResult[] = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      sourceName: FREE_SOURCES[i].name,
      jobs: [],
      durationMs: 0,
      error: r.reason instanceof Error ? r.reason.message : "Unknown error",
    };
  });

  let jobs = deduplicateJobs(sourceResults.flatMap((r) => r.jobs));

  // Apply seniority filter from parsed query
  if (parsed?.seniorityLevel) {
    jobs = filterBySeniority(jobs, parsed.seniorityLevel);
  }

  // Apply workMode filter from parsed query
  if (parsed?.workMode) {
    jobs = jobs.filter((j) => !j.workMode || j.workMode === parsed.workMode);
  }

  // Apply salary filter from parsed query
  if (parsed?.salaryMin) {
    jobs = jobs.filter((j) => !j.salaryMin || j.salaryMin >= parsed.salaryMin!);
  }

  return { jobs, sourceResults };
}
