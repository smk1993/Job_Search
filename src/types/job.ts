export interface JobWithAuthStatus {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  jobType: string | null;
  workMode: string | null;
  sourceUrl: string;
  sourcePlatform: string;
  postedAt: string | null;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];
  sponsorsVisa: boolean;
  isRedditPost: boolean;
  redditPostId: string | null;
  authorUsername: string | null;
  subreddit: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  workAuthStatus: "ok" | "blocked";
  workAuthReason: string | null;
  isSaved?: boolean;
}
