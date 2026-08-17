import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

const RESUME_DIR = path.join(process.cwd(), "public/uploads/resumes");
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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

  return NextResponse.json({ resumeUrl, originalName: file.name });
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
