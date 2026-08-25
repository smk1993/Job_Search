import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      bio: true,
      country: true,
      workAuthType: true,
      linkedinUrl: true,
      githubUrl: true,
      phone: true,
      resumeUrl: true,
      resumeText: true,
    },
  });

  return NextResponse.json({
    user: user
      ? { ...user, hasResume: !!user.resumeText, resumeText: undefined }
      : null,
  });
}

const schema = z.object({
  name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(10).optional(),
  workAuthType: z
    .enum(["CITIZEN", "PERMANENT_RESIDENT", "WORK_VISA", "STUDENT_VISA", "NO_AUTHORIZATION"])
    .optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  phone: z.string().max(30).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        name: true,
        bio: true,
        country: true,
        workAuthType: true,
        linkedinUrl: true,
        githubUrl: true,
        phone: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
