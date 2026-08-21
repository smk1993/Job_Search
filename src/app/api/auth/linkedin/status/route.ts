import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  const connected = !!(
    user?.image &&
    (user.image.includes("licdn.com") || user.image.includes("linkedin.com"))
  );

  return NextResponse.json({
    configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    connected,
  });
}
