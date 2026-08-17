import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectUsAuthRequired } from "@/lib/work-auth-filter";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { title, company, description } = parsed.data;
  const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(description);

  // Create a unique URL to avoid duplicate conflicts
  const sourceUrl = `https://manual-entry/${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const job = await prisma.job.create({
    data: {
      title,
      company,
      description,
      sourceUrl,
      sourcePlatform: "OTHER",
      requiresUsAuth,
      workAuthKeywords: matchedKeywords,
    },
  });

  return NextResponse.json({ jobId: job.id });
}
