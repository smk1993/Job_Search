import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { JobWithAuthStatus } from "@/types/job";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  try {
    const body = await req.json();
    const job = body.job as JobWithAuthStatus;

    if (!job?.sourceUrl) {
      return NextResponse.json({ error: "Missing job data" }, { status: 400 });
    }

    const dbJob = await prisma.job.upsert({
      where: { sourceUrl: job.sourceUrl },
      create: {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        jobType: (job.jobType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP") ?? undefined,
        workMode: (job.workMode as "REMOTE" | "HYBRID" | "ONSITE") ?? undefined,
        sourceUrl: job.sourceUrl,
        sourcePlatform: (job.sourcePlatform as "LINKEDIN" | "INDEED" | "GLASSDOOR" | "ZIPRECRUITER" | "REDDIT" | "OTHER"),
        postedAt: job.postedAt ? new Date(job.postedAt) : undefined,
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
      },
      update: {},
      select: { id: true },
    });

    await prisma.savedJob.upsert({
      where: { userId_jobId: { userId, jobId: dbJob.id } },
      create: { userId, jobId: dbJob.id },
      update: {},
    });

    return NextResponse.json({ jobId: dbJob.id });
  } catch (err) {
    console.error("Save job error:", err);
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const sourceUrl = req.nextUrl.searchParams.get("sourceUrl");
  if (!sourceUrl) {
    return NextResponse.json({ error: "Missing sourceUrl" }, { status: 400 });
  }

  try {
    const dbJob = await prisma.job.findUnique({
      where: { sourceUrl },
      select: { id: true },
    });

    if (!dbJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    await prisma.savedJob.deleteMany({ where: { userId, jobId: dbJob.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unsave job error:", err);
    return NextResponse.json({ error: "Failed to remove saved job" }, { status: 500 });
  }
}
