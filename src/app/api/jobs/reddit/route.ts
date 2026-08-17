import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeRedditJobs } from "@/lib/reddit";
import { filterByWorkAuth } from "@/lib/work-auth-filter";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const { searchParams } = req.nextUrl;
  const subreddit = searchParams.get("subreddit") ?? undefined;
  const applyWorkAuthFilter = searchParams.get("applyWorkAuthFilter") === "true";

  try {
    const [user, redditJobs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { country: true, workAuthType: true },
      }),
      scrapeRedditJobs({ subreddit }),
    ]);

    const mapped = redditJobs.map((j: typeof redditJobs[0]) => ({
      id: j.redditPostId,
      title: j.title,
      company: j.company ?? "Unknown",
      location: j.location,
      description: j.description,
      jobType: null as string | null,
      workMode: null as string | null,
      sourceUrl: j.sourceUrl,
      sourcePlatform: j.sourcePlatform as string,
      postedAt: j.postedAt.toISOString(),
      salary: j.salary,
      salaryMin: null as number | null,
      salaryMax: null as number | null,
      requiresUsAuth: j.requiresUsAuth,
      workAuthKeywords: j.workAuthKeywords,
      isRedditPost: true,
      redditPostId: j.redditPostId,
      authorUsername: j.authorUsername,
      subreddit: j.subreddit,
      contactEmail: j.contactEmail,
      contactLinkedin: j.contactLinkedin,
      isSaved: false,
    }));

    const jobs = filterByWorkAuth(
      mapped,
      user?.country ?? null,
      user?.workAuthType ?? null,
      applyWorkAuthFilter
    );

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("Reddit jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch Reddit jobs" }, { status: 500 });
  }
}
