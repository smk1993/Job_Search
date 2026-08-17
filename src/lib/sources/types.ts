export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: Date | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];
  // HN / Reddit-specific (null for regular jobs)
  isRedditPost: boolean;
  redditPostId: string | null;
  authorUsername: string | null;
  subreddit: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
}

export interface SearchResult {
  sourceName: string;
  jobs: NormalizedJob[];
  durationMs: number;
  error?: string;
}
