import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filterByWorkAuth } from "@/lib/work-auth-filter";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const [user, savedJobs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { country: true, workAuthType: true },
    }),
    prisma.savedJob.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { savedAt: "desc" },
    }),
  ]);

  const mapped = (savedJobs as Array<{ job: { id: string; title: string; company: string; location: string | null; description: string; jobType: string | null; workMode: string | null; sourceUrl: string; sourcePlatform: string; postedAt: Date | null; salary: string | null; salaryMin: number | null; salaryMax: number | null; requiresUsAuth: boolean; workAuthKeywords: string[]; isRedditPost: boolean; redditPostId: string | null; authorUsername: string | null; subreddit: string | null; contactEmail: string | null; contactLinkedin: string | null } }>).map((s) => ({
    id: s.job.id,
    title: s.job.title,
    company: s.job.company,
    location: s.job.location,
    description: s.job.description,
    jobType: s.job.jobType as string | null,
    workMode: s.job.workMode as string | null,
    sourceUrl: s.job.sourceUrl,
    sourcePlatform: s.job.sourcePlatform as string,
    postedAt: s.job.postedAt?.toISOString() ?? null,
    salary: s.job.salary,
    salaryMin: s.job.salaryMin,
    salaryMax: s.job.salaryMax,
    requiresUsAuth: s.job.requiresUsAuth,
    workAuthKeywords: s.job.workAuthKeywords,
    isRedditPost: s.job.isRedditPost,
    redditPostId: s.job.redditPostId,
    authorUsername: s.job.authorUsername,
    subreddit: s.job.subreddit,
    contactEmail: s.job.contactEmail,
    contactLinkedin: s.job.contactLinkedin,
    isSaved: true,
  }));

  const jobs = filterByWorkAuth(
    mapped,
    user?.country ?? null,
    user?.workAuthType ?? null,
    false // annotate but don't remove blocked from saved list
  ).map((j) => ({ ...j, isSaved: true }));

  return NextResponse.json({ jobs });
}
