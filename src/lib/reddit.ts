import { detectUsAuthRequired } from "./work-auth-filter";

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const LINKEDIN_REGEX = /https?:\/\/(www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+\/?/g;
const SALARY_REGEX = /\$[\d,]+(?:k|K)?(?:\s*[-\u2013]\s*\$?[\d,]+(?:k|K)?)?(?:\s*(?:per\s+(?:year|hr|hour|month)|\/(?:yr|hr|mo)))?/g;
const LOCATION_REGEX = /(?:Location|Based in|Located in|Office|HQ|City)[:\s]+([^\n|,]+)/i;

export interface RedditJobPost {
  redditPostId: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  description: string;
  sourceUrl: string;
  postedAt: Date;
  authorUsername: string | null;
  subreddit: string;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];
  contactEmail: string | null;
  contactLinkedin: string | null;
  isRedditPost: boolean;
  sourcePlatform: "REDDIT";
}

interface HNItem {
  id: number;
  by?: string;
  title?: string;
  text?: string;
  kids?: number[];
  time?: number;
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
}

const HN_API = "https://hacker-news.firebaseio.com/v0";
const HN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let hnJobsCache: { jobs: RedditJobPost[]; expiresAt: number } | null = null;

function stripHtml(html: string): string {
  return html
    .replace(/<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchHNItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`);
    return await res.json() as HNItem;
  } catch {
    return null;
  }
}

// Get latest "Who is hiring?" and "Who wants to be hired?" thread IDs
// from the official whoishiring HN account
async function getLatestThreads(): Promise<Map<string, HNItem>> {
  const res = await fetch(`${HN_API}/user/whoishiring.json`);
  const user = await res.json() as { submitted: number[] };
  const submissions = user.submitted.slice(0, 10);

  // Fetch in parallel
  const items = await Promise.all(submissions.map(fetchHNItem));

  const threads = new Map<string, HNItem>();
  for (const item of items) {
    if (!item?.title) continue;
    if (item.title.includes("Who is hiring?") && !threads.has("who-is-hiring")) {
      threads.set("who-is-hiring", item);
    }
    if (item.title.includes("Who wants to be hired?") && !threads.has("who-wants-to-be-hired")) {
      threads.set("who-wants-to-be-hired", item);
    }
    if (threads.size === 2) break;
  }
  return threads;
}

function parseHNItem(item: HNItem, threadLabel: string): RedditJobPost | null {
  if (!item.text || item.deleted || item.dead) return null;
  const text = stripHtml(item.text);
  if (text.length < 30) return null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] ?? "";

  // HN job posts use "|" to separate: Company | Role | Location | ...
  const parts = firstLine.split("|").map((p) => p.trim());
  const company = parts.length > 1 ? parts[0] : null;
  const role = parts.length > 1 ? parts[1] : firstLine.slice(0, 120);
  const locationFromParts = parts.length > 2 ? parts[2] : null;
  const locationMatch = text.match(LOCATION_REGEX);
  const location = locationFromParts ?? locationMatch?.[1]?.trim() ?? null;

  const salaries = text.match(SALARY_REGEX);
  const emails = text.match(EMAIL_REGEX);
  const linkedins = text.match(LINKEDIN_REGEX);
  const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(text);

  return {
    redditPostId: `hn_${item.id}`,
    title: role || firstLine.slice(0, 120),
    company,
    location,
    salary: salaries?.[0] ?? null,
    description: text,
    sourceUrl: `https://news.ycombinator.com/item?id=${item.id}`,
    postedAt: new Date((item.time ?? 0) * 1000),
    authorUsername: item.by ?? null,
    subreddit: threadLabel,
    requiresUsAuth,
    workAuthKeywords: matchedKeywords,
    contactEmail: emails?.[0] ?? null,
    contactLinkedin: linkedins?.[0] ?? null,
    isRedditPost: true,
    sourcePlatform: "REDDIT" as const,
  };
}

async function fetchAllHNJobs(limit = 30): Promise<RedditJobPost[]> {
  const allThreads = await getLatestThreads();
  const allJobs: RedditJobPost[] = [];

  for (const [label, thread] of Array.from(allThreads.entries())) {
    if (!thread?.kids) continue;
    try {
      const commentIds = thread.kids.slice(0, limit);
      const comments = await Promise.all(commentIds.map(fetchHNItem));
      for (const comment of comments) {
        if (!comment) continue;
        const parsed = parseHNItem(comment, label);
        if (parsed) allJobs.push(parsed);
      }
    } catch (err) {
      console.error(`Failed to fetch HN comments for ${label}:`, err);
    }
  }

  const seen = new Set<string>();
  return allJobs.filter((j) => {
    if (seen.has(j.redditPostId)) return false;
    seen.add(j.redditPostId);
    return true;
  });
}

export async function scrapeRedditJobs({
  subreddit: threadFilter,
  limit = 30,
}: {
  subreddit?: string;
  limit?: number;
}): Promise<RedditJobPost[]> {
  // Return from cache if fresh
  if (!hnJobsCache || Date.now() >= hnJobsCache.expiresAt) {
    const jobs = await fetchAllHNJobs(limit);
    hnJobsCache = { jobs, expiresAt: Date.now() + HN_CACHE_TTL };
  }

  if (threadFilter) {
    return hnJobsCache.jobs.filter((j) => j.subreddit === threadFilter);
  }
  return hnJobsCache.jobs;
}
