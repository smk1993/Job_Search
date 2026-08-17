import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const [
    totalApplications,
    savedJobsCount,
    coverLettersCount,
    emailsSentCount,
    applicationsByStatus,
    applicationsWithPlatform,
  ] = await Promise.all([
    prisma.jobApplication.count({ where: { userId } }),
    prisma.savedJob.count({ where: { userId } }),
    prisma.coverLetter.count({ where: { userId } }),
    prisma.emailLog.count({ where: { userId, status: "SENT" } }),
    prisma.jobApplication.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
    prisma.jobApplication.findMany({
      where: { userId },
      select: { job: { select: { sourcePlatform: true } }, appliedAt: true },
      orderBy: { appliedAt: "asc" },
    }),
  ]);

  const statusData = (applicationsByStatus as Array<{ status: string; _count: { status: number } }>).map((g) => ({
    status: g.status,
    count: g._count.status,
  }));

  const platformCounts: Record<string, number> = {};
  for (const app of applicationsWithPlatform) {
    const p = app.job.sourcePlatform as string;
    platformCounts[p] = (platformCounts[p] ?? 0) + 1;
  }
  const applicationsByPlatformData = Object.entries(platformCounts).map(
    ([platform, count]) => ({ platform, count })
  );

  // Recent applications last 30 days grouped by day
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dayGroups: Record<string, number> = {};
  for (const app of applicationsWithPlatform) {
    if (app.appliedAt >= thirtyDaysAgo) {
      const day = app.appliedAt.toISOString().split("T")[0];
      dayGroups[day] = (dayGroups[day] ?? 0) + 1;
    }
  }
  const recentApplications = Object.entries(dayGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([appliedAt, count]) => ({ appliedAt, count }));

  return NextResponse.json({
    totalApplications,
    savedJobsCount,
    coverLettersCount,
    emailsSentCount,
    applicationsByStatus: statusData,
    applicationsByPlatform: applicationsByPlatformData,
    recentApplications,
  });
}
