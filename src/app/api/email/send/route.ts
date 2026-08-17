import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { z } from "zod";

const schema = z.object({
  to: z.string().email("Invalid recipient email"),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Message body is required").max(10000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id!;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }

    const { to, subject, body: emailBody } = parsed.data;

    let resendId: string | null = null;
    let status: "SENT" | "FAILED" = "SENT";
    let errorMessage: string | null = null;

    try {
      const result = await sendEmail({ to, subject, body: emailBody });
      resendId = result.id ?? null;
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Failed to send email";
    }

    await prisma.emailLog.create({
      data: {
        userId,
        recipientEmail: to,
        subject,
        body: emailBody,
        resendId,
        status,
        errorMessage,
      },
    });

    if (status === "FAILED") {
      return NextResponse.json(
        { error: errorMessage ?? "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
