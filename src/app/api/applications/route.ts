import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
