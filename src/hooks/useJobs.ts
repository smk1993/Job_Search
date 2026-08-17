import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// ─── Job Search ────────────────────────────────────────────────────────────

interface JobSearchParams {
  q: string;
  workMode: string;
  jobType: string;
  page: number;
  applyWorkAuthFilter: boolean;
  includeHN: boolean;
}

export function useJobs(params: JobSearchParams) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () =>
      axios
        .get("/api/jobs/search", {
          params: {
            q: params.q,
            workMode: params.workMode,
            jobType: params.jobType,
            page: params.page,
            applyWorkAuthFilter: params.applyWorkAuthFilter,
            includeHN: params.includeHN,
          },
        })
        .then((r) => r.data),
    enabled: !!params.q.trim(),
    staleTime: 10 * 60 * 1000, // 10 min — matches server cache TTL
    gcTime: 30 * 60 * 1000,    // keep in memory for 30 min
    placeholderData: (prev) => prev, // show previous results while refetching
  });
}

// ─── Saved Jobs ────────────────────────────────────────────────────────────

export function useSavedJobs() {
  return useQuery({
    queryKey: ["saved-jobs"],
    queryFn: () => axios.get("/api/jobs/saved").then((r) => r.data),
    staleTime: 60 * 1000,
  });
}

// ─── Applications ──────────────────────────────────────────────────────────

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn: () => axios.get("/api/applications").then((r) => r.data),
    staleTime: 30 * 1000,
  });
}

// ─── Reddit Jobs ───────────────────────────────────────────────────────────

export function useRedditJobs(
  subreddit: string | undefined,
  applyWorkAuthFilter: boolean
) {
  return useQuery({
    queryKey: ["reddit-jobs", subreddit, applyWorkAuthFilter],
    queryFn: () =>
      axios
        .get("/api/jobs/reddit", {
          params: { subreddit, applyWorkAuthFilter },
        })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Stats ─────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => axios.get("/api/stats").then((r) => r.data),
    staleTime: 60 * 1000,
  });
}
