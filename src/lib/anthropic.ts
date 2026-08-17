import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TONE_GUIDANCE: Record<string, string> = {
  professional: "formal, polished, and executive-level",
  conversational: "warm, personable, and approachable while remaining professional",
  enthusiastic: "energetic, passionate, and showing genuine excitement for the role",
};

interface CoverLetterInput {
  user: { name: string | null; bio: string | null } | null;
  job: { title: string; company: string; description: string };
  tone: string;
  customInstructions?: string;
}

export async function generateCoverLetter(input: CoverLetterInput): Promise<ReadableStream<Uint8Array>> {
  const { user, job, tone, customInstructions } = input;

  const systemPrompt = `You are an expert career coach specializing in compelling cover letters. Write in a ${TONE_GUIDANCE[tone] ?? TONE_GUIDANCE.professional} tone. Write in first person. Keep to 3-4 paragraphs (~350 words). Never start with "I am writing to express my interest." Start with a strong, specific hook.`;

  const userPrompt = `Write a cover letter for this job application:

Candidate: ${user?.name ?? "the applicant"}
Background: ${user?.bio ?? "A skilled professional seeking new opportunities"}

Job Title: ${job.title}
Company: ${job.company}
Job Description:
${job.description.slice(0, 3000)}${job.description.length > 3000 ? "..." : ""}

${customInstructions ? `Additional Instructions:\n${customInstructions}` : ""}

Requirements:
1. Open with a specific, compelling hook
2. Show genuine knowledge of ${job.company} and specific reasons for wanting this role
3. Connect candidate skills directly to job requirements
4. Close with a confident, specific call to action
5. 3-4 paragraphs, approximately 300-400 words`;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });
}
