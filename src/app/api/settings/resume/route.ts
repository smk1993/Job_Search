import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const RESUME_DIR = path.join(process.cwd(), "public/uploads/resumes");
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ExtractedProfile {
  name: string | null;
  phone: string | null;
  email: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  location: string | null;
  summary: string | null;
}

const EXTRACTION_PROMPT = `You are a resume parser. Extract the following fields from this resume.
Return ONLY valid JSON — no markdown, no code fences, no explanation.

{
  "name": "full name of the person (string or null)",
  "phone": "phone number as written (string or null)",
  "email": "email address (string or null)",
  "linkedinUrl": "full LinkedIn URL starting with https:// (string or null)",
  "githubUrl": "full GitHub URL starting with https:// (string or null)",
  "location": "city, state/country (string or null)",
  "summary": "first 250 characters of their professional summary or objective (string or null)"
}

Rules:
- If a LinkedIn username is given without a URL, construct: https://linkedin.com/in/<username>
- If a GitHub username is given without a URL, construct: https://github.com/<username>
- Return null for any field not found
- summary should be a concise professional bio, not the full resume text`;

async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  // Fallback for .doc (old binary format) — no reliable pure-JS parser; return empty
  return "";
}

async function parseResumeWithAI(text: string): Promise<ExtractedProfile> {
  const fallback: ExtractedProfile = {
    name: null, phone: null, email: null,
    linkedinUrl: null, githubUrl: null, location: null, summary: null,
  };

  if (!text.trim()) return fallback;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\n---RESUME TEXT---\n${text.slice(0, 6000)}`,
        },
      ],
    });

    const raw = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const parsed = JSON.parse(raw) as ExtractedProfile;
    // Truncate summary to 250 chars just in case
    if (parsed.summary && parsed.summary.length > 250) {
      parsed.summary = parsed.summary.slice(0, 250).trimEnd() + "…";
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const formData = await req.formData();
  const file = formData.get("resume") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Only PDF, DOC, and DOCX files are allowed" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const filename = `${userId}.${ext}`;
  const filePath = path.join(RESUME_DIR, filename);

  await mkdir(RESUME_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const resumeUrl = `/uploads/resumes/${filename}`;
  await prisma.user.update({ where: { id: userId }, data: { resumeUrl } });

  // Parse CV text and extract profile fields (runs in parallel with DB update above,
  // but we await here to return the result in one response)
  const resumeText = await extractTextFromBuffer(buffer, file.type, file.name);
  const extractedProfile = await parseResumeWithAI(resumeText);

  return NextResponse.json({ resumeUrl, originalName: file.name, extractedProfile });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { resumeUrl: true } });
  if (user?.resumeUrl) {
    const filePath = path.join(process.cwd(), "public", user.resumeUrl);
    try {
      await unlink(filePath);
    } catch {
      // File may already be gone — that's fine
    }
    await prisma.user.update({ where: { id: userId }, data: { resumeUrl: null } });
  }

  return NextResponse.json({ success: true });
}
