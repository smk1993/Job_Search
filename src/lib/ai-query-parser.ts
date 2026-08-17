import Anthropic from "@anthropic-ai/sdk";
import { LRUCache } from "./cache";

export interface ParsedSearchQuery {
  keywords: string[];
  jobTitle: string | null;
  rawQuery: string;
  seniorityLevel: "intern" | "junior" | "mid" | "senior" | "lead" | "principal" | "executive" | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  location: string | null;
  requiresNoSponsorship: boolean;
  sponsorsVisa: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  companyName: string | null;
  excludeCompanies: string[];
  confidence: number;
  interpretation: string;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Cache parsed queries — same input always produces the same structured output
const queryCache = new LRUCache<ParsedSearchQuery>(500, 60 * 60 * 1000); // 1 hour

const SYSTEM_PROMPT = `You are a job search query parser. Extract structured search parameters from natural language queries.

RULES:
1. For keywords: extract core technical skills and role identifiers. Keep lowercase. Max 5 items.
2. For jobTitle: generate the most likely formal job title (e.g. "Senior React Developer").
3. Seniority levels: "intern" | "junior" | "mid" | "senior" | "lead" | "principal" | "executive" | null
4. Work authorization:
   - "no green card needed", "no sponsorship required", "usc only", "no visa" → requiresNoSponsorship: true
   - "h1b friendly", "will sponsor", "sponsors visa", "visa ok" → sponsorsVisa: true
5. Location: extract city/state/country. "Bay Area" → "San Francisco Bay Area". "NYC" → "New York".
6. Salary: "$150k" → salaryMin: 150000. "150-200k" → salaryMin: 150000, salaryMax: 200000.
7. interpretation: one concise sentence summarizing what the user is looking for.
8. confidence: 0.0–1.0 (how confident you are in the interpretation).

Respond with ONLY valid JSON. No markdown, no code fences, no explanation.

Example output:
{"keywords":["react","typescript"],"jobTitle":"Senior React Developer","rawQuery":"...","seniorityLevel":"senior","workMode":"REMOTE","jobType":"FULL_TIME","location":"New York","requiresNoSponsorship":true,"sponsorsVisa":false,"salaryMin":null,"salaryMax":null,"companyName":null,"excludeCompanies":[],"confidence":0.9,"interpretation":"Senior remote React Developer roles in New York that do not require US visa sponsorship."}`;

function fallbackParse(query: string): ParsedSearchQuery {
  const lower = query.toLowerCase();
  return {
    keywords: query.trim().split(/\s+/).filter(Boolean).slice(0, 5),
    jobTitle: null,
    rawQuery: query,
    seniorityLevel:
      lower.includes("senior") || lower.includes("sr.") ? "senior"
      : lower.includes("junior") || lower.includes("jr.") ? "junior"
      : lower.includes("intern") ? "intern"
      : lower.includes("lead") ? "lead"
      : lower.includes("principal") ? "principal"
      : null,
    workMode:
      lower.includes("remote") ? "REMOTE"
      : lower.includes("hybrid") ? "HYBRID"
      : lower.includes("onsite") || lower.includes("on-site") ? "ONSITE"
      : null,
    jobType:
      lower.includes("contract") ? "CONTRACT"
      : lower.includes("part-time") || lower.includes("part time") ? "PART_TIME"
      : lower.includes("intern") ? "INTERNSHIP"
      : null,
    location: null,
    requiresNoSponsorship:
      lower.includes("no sponsorship") || lower.includes("no visa") || lower.includes("green card"),
    sponsorsVisa:
      lower.includes("sponsor") || lower.includes("h1b") || lower.includes("h-1b"),
    salaryMin: null,
    salaryMax: null,
    companyName: null,
    excludeCompanies: [],
    confidence: 0.3,
    interpretation: query,
  };
}

export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  const trimmed = query.trim();
  if (!trimmed) return fallbackParse(query);

  const cacheKey = trimmed.toLowerCase();
  const cached = queryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const parsed = JSON.parse(text) as ParsedSearchQuery;
    parsed.rawQuery = query;

    queryCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.warn("AI query parser failed, using regex fallback:", err);
    return fallbackParse(query);
  }
}
