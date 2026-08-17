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

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  author: { name: string } | string;
  created_utc: number;
}

function extractCompany(title: string): string | null {
  const match = title.match(/\bat\s+([^|(\[,]+?)(?:\s*[-|(\[]|$)/i);
  return match?.[1]?.trim() ?? null;
}

function parsePost(post: RedditPost, subredditName: string): RedditJobPost | null {
  const selftext = post.selftext || "";
  if (selftext.length < 30 && post.title.length < 50) return null;
  const fullText = `${post.title}\n${selftext}`;
  const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(fullText);
  const emails = fullText.match(EMAIL_REGEX);
  const linkedins = fullText.match(LINKEDIN_REGEX);
  const salaries = fullText.match(SALARY_REGEX);
  const locationMatch = fullText.match(LOCATION_REGEX);
  const authorName = typeof post.author === "string" ? post.author : post.author?.name ?? null;
  return {
    redditPostId: post.id,
    title: post.title,
    company: extractCompany(post.title),
    location: locationMatch?.[1]?.trim() ?? null,
    salary: salaries?.[0] ?? null,
    description: selftext || post.title,
    sourceUrl: `https://reddit.com${post.permalink}`,
    postedAt: new Date(post.created_utc * 1000),
    authorUsername: authorName !== "[deleted]" ? authorName : null,
    subreddit: subredditName,
    requiresUsAuth,
    workAuthKeywords: matchedKeywords,
    contactEmail: emails?.[0] ?? null,
    contactLinkedin: linkedins?.[0] ?? null,
    isRedditPost: true,
    sourcePlatform: "REDDIT" as const,
  };
}

async function getRedditToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID!;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!;
  const username = process.env.REDDIT_USERNAME!;
  const password = process.env.REDDIT_PASSWORD!;

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "JobSearchSaaS/1.0",
    },
    body: new URLSearchParams({ grant_type: "password", username, password }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function fetchPosts(subreddit: string, sort: "new" | "hot", limit: number): Promise<RedditPost[]> {
  const token = await getRedditToken();
  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/${sort}?limit=${limit}&raw_json=1`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": "JobSearchSaaS/1.0" } }
  );
  const data = await res.json() as { data: { children: Array<{ data: RedditPost }> } };
  return data.data.children.map((c) => c.data);
}

async function searchPosts(subreddit: string, query: string, limit: number): Promise<RedditPost[]> {
  const token = await getRedditToken();
  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=${limit}&raw_json=1`,
    { headers: { Authorization: `Bearer ${token}`, "User-Agent": "JobSearchSaaS/1.0" } }
  );
  const data = await res.json() as { data: { children: Array<{ data: RedditPost }> } };
  return data.data.children.map((c) => c.data);
}

const SUBREDDIT_CONFIGS = [
  { name: "forhire", strategy: "new" as const, query: "", filter: (t: string) => t.toLowerCase().includes("[hiring]") },
  { name: "remotejobs", strategy: "new" as const, query: "", filter: () => true },
  { name: "jobpostings", strategy: "new" as const, query: "", filter: () => true },
  { name: "webdev", strategy: "search" as const, query: "hiring", filter: (t: string) => t.toLowerCase().includes("hiring") },
];

export async function scrapeRedditJobs({
  subreddit: specificSubreddit,
  limit = 25,
}: {
  subreddit?: string;
  limit?: number;
}): Promise<RedditJobPost[]> {
  const configs = specificSubreddit
    ? SUBREDDIT_CONFIGS.filter((c) => c.name === specificSubreddit)
    : SUBREDDIT_CONFIGS;

  const allJobs: RedditJobPost[] = [];

  for (const config of configs) {
    try {
      let posts: RedditPost[];
      if (config.strategy === "search") {
        posts = await searchPosts(config.name, config.query, limit);
      } else {
        posts = await fetchPosts(config.name, "new", limit);
      }
      const filtered = posts.filter((p) => config.filter(p.title));
      for (const post of filtered) {
        const parsed = parsePost(post, config.name);
        if (parsed) allJobs.push(parsed);
      }
    } catch (err) {
      console.error(`Failed to scrape r/${config.name}:`, err);
    }
  }

  const seen = new Set<string>();
  return allJobs.filter((j) => {
    if (seen.has(j.redditPostId)) return false;
    seen.add(j.redditPostId);
    return true;
  });
}
