import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const emails = await prisma.emailLog.findMany({
    where: { userId },
    orderBy: { sentAt: "desc" },
    take: 100,
    select: {
      id: true,
      recipientEmail: true,
      subject: true,
      body: true,
      sentAt: true,
      status: true,
    },
  });

  return NextResponse.json({
    emails: emails.map((e: { id: string; recipientEmail: string; subject: string; body: string; sentAt: Date; status: string }) => ({
      id: e.id,
      recipientEmail: e.recipientEmail,
      subject: e.subject,
      body: e.body,
      sentAt: e.sentAt.toISOString(),
      status: e.status,
    })),
  });
}
