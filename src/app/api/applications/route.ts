import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type DbPlatform = "LINKEDIN" | "INDEED" | "GLASSDOOR" | "ZIPRECRUITER" | "REDDIT" | "OTHER";
const DB_PLATFORMS = new Set<string>(["LINKEDIN", "INDEED", "GLASSDOOR", "ZIPRECRUITER", "REDDIT", "OTHER"]);
function toDbPlatform(p: string): DbPlatform {
  return DB_PLATFORMS.has(p) ? (p as DbPlatform) : "OTHER";
}

const postSchema = z.object({
  job: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().nullable().optional(),
    description: z.string(),
    jobType: z.string().nullable().optional(),
    workMode: z.string().nullable().optional(),
    sourceUrl: z.string(),
    sourcePlatform: z.string(),
    postedAt: z.string().nullable().optional(),
    salary: z.string().nullable().optional(),
    salaryMin: z.number().nullable().optional(),
    salaryMax: z.number().nullable().optional(),
    requiresUsAuth: z.boolean().optional().default(false),
    workAuthKeywords: z.array(z.string()).optional().default([]),
    isRedditPost: z.boolean().optional().default(false),
    redditPostId: z.string().nullable().optional(),
    authorUsername: z.string().nullable().optional(),
    subreddit: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    contactLinkedin: z.string().nullable().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  try {
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { job } = parsed.data;

    // Upsert the job so it exists in the DB
    const dbJob = await prisma.job.upsert({
      where: { sourceUrl: job.sourceUrl },
      create: {
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        description: job.description,
        jobType: (job.jobType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP") ?? undefined,
        workMode: (job.workMode as "REMOTE" | "HYBRID" | "ONSITE") ?? undefined,
        sourceUrl: job.sourceUrl,
        sourcePlatform: toDbPlatform(job.sourcePlatform),
        postedAt: job.postedAt ? new Date(job.postedAt) : undefined,
        salary: job.salary ?? null,
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
        requiresUsAuth: job.requiresUsAuth ?? false,
        workAuthKeywords: job.workAuthKeywords ?? [],
        isRedditPost: job.isRedditPost ?? false,
        redditPostId: job.redditPostId ?? null,
        authorUsername: job.authorUsername ?? null,
        subreddit: job.subreddit ?? null,
        contactEmail: job.contactEmail ?? null,
        contactLinkedin: job.contactLinkedin ?? null,
      },
      update: {},
      select: { id: true },
    });

    // Upsert the application — if already tracked, leave status as-is
    const application = await prisma.jobApplication.upsert({
      where: { userId_jobId: { userId, jobId: dbJob.id } },
      create: { userId, jobId: dbJob.id, status: "APPLIED" },
      update: {}, // don't downgrade status if already at INTERVIEW, OFFER, etc.
      select: { id: true, status: true },
    });

    return NextResponse.json({ application });
  } catch (err) {
    console.error("Application create error:", err);
    return NextResponse.json({ error: "Failed to track application" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          workMode: true,
          sourcePlatform: true,
          sourceUrl: true,
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json({
    applications: applications.map((a: {
      id: string; status: string; notes: string | null; appliedAt: Date;
      job: { id: string; title: string; company: string; location: string | null; workMode: string | null; sourcePlatform: string; sourceUrl: string };
    }) => ({
      id: a.id,
      status: a.status,
      notes: a.notes,
      appliedAt: a.appliedAt.toISOString(),
      job: {
        id: a.job.id,
        title: a.job.title,
        company: a.job.company,
        location: a.job.location,
        workMode: a.job.workMode,
        sourcePlatform: a.job.sourcePlatform,
        sourceUrl: a.job.sourceUrl,
      },
    })),
  });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum([
    "SAVED",
    "APPLIED",
    "PHONE_SCREEN",
    "INTERVIEW",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
  ]),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { id, status, notes } = parsed.data;

    const application = await prisma.jobApplication.update({
      where: { id, userId },
      data: { status, ...(notes !== undefined && { notes }) },
      select: { id: true, status: true },
    });

    return NextResponse.json({ application });
  } catch (err) {
    console.error("Application update error:", err);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
