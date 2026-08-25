import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const schema = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { url } = parsed.data;

  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JobSearchBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: "Could not fetch the job page. Try a different job board URL." },
        { status: 422 }
      );
    }

    const html = await pageRes.text();

    // Strip scripts, styles, and HTML tags to get readable text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract the job title, company name, and job description from this job listing page text. Return ONLY valid JSON with exactly these keys: title, company, description. The description should include all responsibilities, requirements, and qualifications (max 2500 chars). If you cannot find a value, use null.

Page text:
${text}`,
        },
      ],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const job = JSON.parse(cleaned) as { title: string | null; company: string | null; description: string | null };

    if (!job.description) {
      return NextResponse.json(
        { error: "Could not extract a job description from this URL. The site may require login (e.g. LinkedIn)." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: job.title ?? "Unknown Position",
      company: job.company ?? "Unknown Company",
      description: job.description,
    });
  } catch (err) {
    console.error("fetch-job error:", err);
    return NextResponse.json(
      { error: "Could not load this URL. The site may block automated requests (e.g. LinkedIn). Try Indeed, Glassdoor, or a company careers page." },
      { status: 422 }
    );
  }
}
