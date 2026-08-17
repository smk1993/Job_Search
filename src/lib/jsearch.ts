import axios from "axios";
import { detectUsAuthRequired } from "./work-auth-filter";

const client = axios.create({
  baseURL: "https://jsearch.p.rapidapi.com",
  headers: {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
  },
});

function mapWorkMode(job: Record<string, unknown>): "REMOTE" | "HYBRID" | "ONSITE" {
  if (job.job_is_remote) return "REMOTE";
  const desc = String(job.job_description || "").toLowerCase();
  if (desc.includes("hybrid") || desc.includes("flexible")) return "HYBRID";
  return "ONSITE";
}

function mapJobType(t: string): "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" {
  const n = (t || "").toLowerCase();
  if (n.includes("part")) return "PART_TIME";
  if (n.includes("contract")) return "CONTRACT";
  if (n.includes("freelance")) return "FREELANCE";
  if (n.includes("intern")) return "INTERNSHIP";
  return "FULL_TIME";
}

function mapPlatform(p: string): "LINKEDIN" | "INDEED" | "GLASSDOOR" | "ZIPRECRUITER" | "OTHER" {
  const n = (p || "").toLowerCase();
  if (n.includes("linkedin")) return "LINKEDIN";
  if (n.includes("indeed")) return "INDEED";
  if (n.includes("glassdoor")) return "GLASSDOOR";
  if (n.includes("ziprecruiter")) return "ZIPRECRUITER";
  return "OTHER";
}

export interface JSearchJob {
  title: string;
  company: string;
  location: string;
  description: string;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP";
  workMode: "REMOTE" | "HYBRID" | "ONSITE";
  sourceUrl: string;
  sourcePlatform: "LINKEDIN" | "INDEED" | "GLASSDOOR" | "ZIPRECRUITER" | "OTHER";
  postedAt: Date;
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  requiresUsAuth: boolean;
  workAuthKeywords: string[];
  isRedditPost: boolean;
}

export async function searchJSearchJobs({
  query,
  page = 1,
  workMode = "all",
}: {
  query: string;
  page?: number;
  workMode?: string;
}): Promise<JSearchJob[]> {
  let apiQuery = query;
  if (workMode === "REMOTE") apiQuery += " remote";
  if (workMode === "HYBRID") apiQuery += " hybrid";

  const response = await client.get("/search", {
    params: {
      query: apiQuery,
      page: String(page),
      num_pages: "1",
      date_posted: "week",
      remote_jobs_only: workMode === "REMOTE" ? "true" : "false",
    },
  });

  const data: Record<string, unknown>[] = response.data.data ?? [];

  return data.map((job) => {
    const description = String(job.job_description ?? "");
    const { requiresUsAuth, matchedKeywords } = detectUsAuthRequired(description);
    const city = job.job_city
      ? `${job.job_city}, ${job.job_state ?? ""} ${job.job_country ?? ""}`.trim()
      : String(job.job_country ?? "Unknown");

    return {
      title: String(job.job_title ?? "Unknown"),
      company: String(job.employer_name ?? "Unknown"),
      location: city,
      description,
      jobType: mapJobType(String(job.job_employment_type ?? "")),
      workMode: mapWorkMode(job),
      sourceUrl: String(
        job.job_apply_link ??
          job.job_google_link ??
          `https://jsearch.com/${job.job_id ?? Math.random()}`
      ),
      sourcePlatform: mapPlatform(String(job.job_publisher ?? "")),
      postedAt: job.job_posted_at_datetime_utc
        ? new Date(String(job.job_posted_at_datetime_utc))
        : new Date(),
      salary:
        job.job_min_salary && job.job_max_salary
          ? `$${Number(job.job_min_salary).toLocaleString()} - $${Number(job.job_max_salary).toLocaleString()} ${job.job_salary_period ?? "yearly"}`
          : null,
      salaryMin: job.job_min_salary ? Number(job.job_min_salary) : null,
      salaryMax: job.job_max_salary ? Number(job.job_max_salary) : null,
      requiresUsAuth,
      workAuthKeywords: matchedKeywords,
      isRedditPost: false,
    };
  });
}
