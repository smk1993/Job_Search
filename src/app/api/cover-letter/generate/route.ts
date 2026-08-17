import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCoverLetter } from "@/lib/anthropic";
import { z } from "zod";

const schema = z.object({
  jobId: z.string(),
  tone: z.enum(["professional", "conversational", "enthusiastic"]).default("professional"),
  customInstructions: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { jobId, tone, customInstructions } = parsed.data;

    const [job, user] = await Promise.all([
      prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, title: true, company: true, description: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, bio: true },
      }),
    ]);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const coverLetterStream = await generateCoverLetter({
      user,
      job: { title: job.title, company: job.company, description: job.description },
      tone,
      customInstructions,
    });

    // Tee the stream: forward to client and accumulate for DB save
    let fullText = "";
    const jobId_ = job.id;
    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const data = JSON.parse(line.slice(6)) as { text?: string };
              if (data.text) fullText += data.text;
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.enqueue(chunk);
      },
      async flush() {
        if (fullText) {
          await prisma.coverLetter
            .create({
              data: {
                userId,
                jobId: jobId_,
                content: fullText,
                prompt: `tone:${tone}${customInstructions ? `|${customInstructions.slice(0, 200)}` : ""}`,
              },
            })
            .catch((err: unknown) => console.error("Failed to save cover letter:", err));
        }
      },
    });

    return new Response(coverLetterStream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Cover letter generation error:", err);
    return NextResponse.json({ error: "Failed to generate cover letter" }, { status: 500 });
  }
}
