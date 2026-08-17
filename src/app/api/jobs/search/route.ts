import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJSearchJobs } from "@/lib/jsearch";
import { filterByWorkAuth } from "@/lib/work-auth-filter";

interface MappedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  jobType: string;
  workMode: string;
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: string;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];
  isRedditPost: boolean;
  redditPostId: null;
  authorUsername: null;
  subreddit: null;
  contactEmail: null;
  contactLinkedin: null;
  isSaved: boolean;
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

  if (!q.trim()) return NextResponse.json({ jobs: [] });

  try {
    const [user, rawJobs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          country: true,
          workAuthType: true,
          savedJobs: { select: { job: { select: { sourceUrl: true } } } },
        },
      }),
      searchJSearchJobs({ query: q, page, workMode }),
    ]);

    const savedSourceUrls = new Set(
      (user?.savedJobs ?? []).map((s: { job: { sourceUrl: string } }) => s.job.sourceUrl)
    );

    const filtered =
      jobType === "all" ? rawJobs : rawJobs.filter((j: { jobType: string }) => j.jobType === jobType);

    const mapped: MappedJob[] = (filtered as typeof rawJobs).map((j: typeof rawJobs[0]) => ({
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

    const jobs = filterByWorkAuth(
      mapped,
      user?.country ?? null,
      user?.workAuthType ?? null,
      applyWorkAuthFilter
    );

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("Job search error:", err);
    return NextResponse.json({ error: "Failed to search jobs" }, { status: 500 });
  }
}
