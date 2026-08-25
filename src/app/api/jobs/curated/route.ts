import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchJSearchJobs } from "@/lib/jsearch";
import { deduplicateJobs } from "@/lib/dedup";
import Anthropic from "@anthropic-ai/sdk";
import type { NormalizedJob } from "@/lib/sources/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface ResumeProfile {
  titles: string[];
  skills: string[];
  seniority: string;
  workMode: string | null;
}

async function extractResumeProfile(resumeText: string): Promise<ResumeProfile> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analyze this resume and extract:
- Top 5 job titles the person is suited for (short, searchable titles like "React Engineer", "Data Scientist")
- Top 10 skills
- Seniority level (junior/mid/senior/lead/principal)
- Preferred work mode (REMOTE/HYBRID/ONSITE/null if unclear)

Return ONLY valid JSON, no markdown:
{
  "titles": ["title1", "title2", "title3", "title4", "title5"],
  "skills": ["skill1", "skill2"],
  "seniority": "senior",
  "workMode": null
}

Resume:
${resumeText.slice(0, 8000)}`,
      },
    ],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  try {
    return JSON.parse(raw) as ResumeProfile;
  } catch {
    return { titles: ["software engineer"], skills: [], seniority: "mid", workMode: null };
  }
}

interface RankedEntry {
  index: number;
  matchReason: string;
}

async function rankJobsByFit(resumeText: string, jobs: NormalizedJob[]): Promise<Map<string, string>> {
  const jobSummaries = jobs.slice(0, 30).map((j, i) =>
    `${i + 1}. ${j.title} at ${j.company} — ${j.description.slice(0, 200)}`
  ).join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Given this resume, rank the top 20 jobs from the list by best fit and give a brief match reason.

Resume (first 3000 chars):
${resumeText.slice(0, 3000)}

Jobs:
${jobSummaries}

Return ONLY a valid JSON array (top 20), no markdown:
[
  { "index": 1, "matchReason": "Strong React/TypeScript match for senior frontend role" },
  { "index": 4, "matchReason": "Aligns with your Node.js and cloud background" }
]

Use 1-based index. Write matchReason in 10-15 words.`,
      },
    ],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "[]";
  try {
    const ranked = JSON.parse(raw) as RankedEntry[];
    const map = new Map<string, string>();
    for (const r of ranked) {
      if (r.index >= 1 && r.index <= jobs.length) {
        map.set(jobs[r.index - 1].sourceUrl, r.matchReason);
      }
    }
    return map;
  } catch {
    const fallback = new Map<string, string>();
    jobs.slice(0, 20).forEach(j => fallback.set(j.sourceUrl, "Matches your profile"));
    return fallback;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeText: true },
  });

  if (!user?.resumeText) {
    return NextResponse.json({ error: "no_resume" });
  }

  try {
    // Step 1: Extract profile from resume
    const profile = await extractResumeProfile(user.resumeText);

    // Step 2: Run parallel JSearch queries for top 3 job titles
    const titleQueries = profile.titles.slice(0, 3);
    const searchResults = await Promise.allSettled(
      titleQueries.map((title) =>
        searchJSearchJobs({ query: title, page: 1, workMode: profile.workMode ?? "all" })
      )
    );

    const jsearchJobs = searchResults.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // Convert to NormalizedJob for deduplication
    const normalized: NormalizedJob[] = jsearchJobs.map((j) => ({
      id: j.sourceUrl,
      title: j.title,
      company: j.company,
      location: j.location,
      description: j.description,
      jobType: j.jobType,
      workMode: j.workMode,
      sourceUrl: j.sourceUrl,
      sourcePlatform: j.sourcePlatform,
      postedAt: j.postedAt,
      salary: j.salary,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      requiresUsAuth: j.requiresUsAuth,
      workAuthKeywords: j.workAuthKeywords,
      isRedditPost: false,
      redditPostId: null,
      authorUsername: null,
      subreddit: null,
      contactEmail: null,
      contactLinkedin: null,
    }));

    // Step 3: Deduplicate
    const deduped = deduplicateJobs(normalized);

    // Step 4: Rank top 20 by fit with Claude
    const reasonMap = await rankJobsByFit(user.resumeText, deduped);

    // Build final ranked list (ranked jobs first, then append remaining deduped)
    const rankedUrls = new Set(reasonMap.keys());
    const orderedJobs = [
      ...Array.from(reasonMap.keys())
        .map((url) => deduped.find((j) => j.sourceUrl === url))
        .filter((j): j is NormalizedJob => !!j),
      ...deduped.filter((j) => !rankedUrls.has(j.sourceUrl)),
    ];

    const jobs = orderedJobs.map((job) => ({
      id: job.sourceUrl,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      jobType: job.jobType,
      workMode: job.workMode,
      sourceUrl: job.sourceUrl,
      sourcePlatform: job.sourcePlatform,
      postedAt: job.postedAt?.toISOString() ?? null,
      salary: job.salary,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      requiresUsAuth: job.requiresUsAuth,
      workAuthKeywords: job.workAuthKeywords,
      matchReason: reasonMap.get(job.sourceUrl) ?? null,
      isRedditPost: false,
      redditPostId: null,
      authorUsername: null,
      subreddit: null,
      contactEmail: null,
      contactLinkedin: null,
      workAuthStatus: "ok" as const,
      workAuthReason: null,
      isSaved: false,
    }));

    return NextResponse.json({ jobs, profile });
  } catch (err) {
    console.error("Curated jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch curated jobs" }, { status: 500 });
  }
}
