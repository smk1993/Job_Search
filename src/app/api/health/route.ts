import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering — this route must never be statically pre-rendered
// because it hits the database on every request.
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Lightweight liveness + DB reachability probe.
 * Used by:
 *  - Railway healthcheck (railway.json healthcheckPath)
 *  - Docker HEALTHCHECK instruction
 *  - UptimeRobot external monitor
 *
 * Returns 200 { status: "ok" } when the DB is reachable.
 * Returns 503 { status: "error" } when the DB query fails.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
