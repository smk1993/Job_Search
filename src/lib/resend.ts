import { Resend } from "resend";

export async function sendEmail({
  to,
  subject,
  body,
  fromName = "Job Application",
}: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@jobsearch.app";
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.7;color:#333;">
    ${body
      .split("\n")
      .map((line) => (line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : "<br/>"))
      .join("")}
  </div>`;

  const { data, error } = await resend.emails.send({
    from: `${fromName} <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html,
    text: body,
  });

  if (error) throw new Error(error.message);
  return data!;
}
