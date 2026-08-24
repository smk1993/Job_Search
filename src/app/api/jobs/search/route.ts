import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJSearchJobs } from "@/lib/jsearch";
import { filterByWorkAuth } from "@/lib/work-auth-filter";
import { parseSearchQuery } from "@/lib/ai-query-parser";
import { fetchFromFreeSourcesRegistry } from "@/lib/sources/registry";
import type { NormalizedJob } from "@/lib/sources/types";

interface MappedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  jobType: string | null;
  workMode: string | null;
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: string;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];
  isRedditPost: boolean;
  redditPostId: string | null;
  authorUsername: string | null;
  subreddit: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  isSaved: boolean;
}

function normalizedToMapped(job: NormalizedJob, savedUrls: Set<string>): MappedJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    jobType: job.jobType,
    workMode: job.workMode,
    sourceUrl: job.sourceUrl,
    sourcePlatform: job.sourcePlatform,
    postedAt: job.postedAt?.toISOString() ?? new Date(0).toISOString(),
    salary: job.salary,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    requiresUsAuth: job.requiresUsAuth,
    workAuthKeywords: job.workAuthKeywords,
    isRedditPost: job.isRedditPost,
    redditPostId: job.redditPostId,
    authorUsername: job.authorUsername,
    subreddit: job.subreddit,
    contactEmail: job.contactEmail,
    contactLinkedin: job.contactLinkedin,
    isSaved: savedUrls.has(job.sourceUrl),
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const workMode = searchParams.get("workMode") ?? "all";
  const jobType = searchParams.get("jobType") ?? "all";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const applyWorkAuthFilter = searchParams.get("applyWorkAuthFilter") === "true";

  if (!q.trim()) {
    return NextResponse.json({ jobs: [], interpretation: null, jsearchCount: 0, freeSourceCount: 0 });
  }

  try {
    // Step 1: parse query + fetch user (fast, cached)
    const [parsedQuery, user] = await Promise.all([
      parseSearchQuery(q),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          country: true,
          workAuthType: true,
          savedJobs: { select: { job: { select: { sourceUrl: true } } } },
        },
      }),
    ]);

    // Step 2: run all job sources in parallel
    const [jsearchRaw, freeRegistry] = await Promise.all([
      searchJSearchJobs({ query: q, page, workMode }),
      // Free sources are not paginated — only fetch on page 1
      page === 1
        ? fetchFromFreeSourcesRegistry(q, parsedQuery)
        : Promise.resolve({ jobs: [], sourceResults: [] }),
    ]);

    const savedSourceUrls = new Set<string>(
      user?.savedJobs.map((s) => s.job.sourceUrl) ?? []
    );

    // Map JSearch jobs
    const filteredByType = jobType === "all"
      ? jsearchRaw
      : jsearchRaw.filter((j) => j.jobType === jobType);

    const mappedJSearch: MappedJob[] = filteredByType.map((j) => ({
      id: j.sourceUrl,
      title: j.title,
      company: j.company,
      location: j.location,
      description: j.description,
      jobType: j.jobType,
      workMode: j.workMode,
      sourceUrl: j.sourceUrl,
      sourcePlatform: j.sourcePlatform,
      postedAt: j.postedAt.toISOString(),
      salary: j.salary,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      requiresUsAuth: j.requiresUsAuth,
      workAuthKeywords: j.workAuthKeywords,
      isRedditPost: false,
      redditPostId: null,
      authorUsername: null,
      subreddit: null,
      contactEmail: null,
      contactLinkedin: null,
      isSaved: savedSourceUrls.has(j.sourceUrl),
    }));

    // Map free-source jobs
    const freeJobsFiltered = jobType === "all"
      ? freeRegistry.jobs
      : freeRegistry.jobs.filter((j) => j.jobType === jobType);

    const mappedFree: MappedJob[] = freeJobsFiltered.map((j) =>
      normalizedToMapped(j, savedSourceUrls)
    );

    // JSearch first (most relevant), then free sources
    const combined = [...mappedJSearch, ...mappedFree];

    const jobs = filterByWorkAuth(
      combined,
      user?.country ?? null,
      user?.workAuthType ?? null,
      applyWorkAuthFilter
    );

    return NextResponse.json({
      jobs,
      // jsearchCount drives pagination — free sources are page-1-only, not paginated
      jsearchCount: mappedJSearch.length,
      freeSourceCount: mappedFree.length,
      interpretation: parsedQuery.interpretation,
      confidence: parsedQuery.confidence,
      parsedQuery,
    });
  } catch (err) {
    console.error("Job search error:", err);
    return NextResponse.json({ error: "Failed to search jobs" }, { status: 500 });
  }
}
