"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, FileText } from "lucide-react";
import type { JobWithAuthStatus } from "@/types/job";

interface CuratedJob extends JobWithAuthStatus {
  matchReason: string | null;
}

interface CuratedResponse {
  jobs: CuratedJob[];
  profile: {
    titles: string[];
    skills: string[];
    seniority: string;
    workMode: string | null;
  };
  error?: string;
}

export default function CuratedJobsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, isFetching, refetch } = useQuery<CuratedResponse>({
    queryKey: ["curated-jobs", refreshKey],
    queryFn: () => axios.get("/api/jobs/curated").then((r) => r.data),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
  });

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  const noResume = data?.error === "no_resume";
  const jobs = data?.jobs ?? [];
  const profile = data?.profile;

  return (
    <div>
      <TopNav title="For You" />
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Jobs matched to your resume
            </h2>
            {profile && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Based on your background as {profile.seniority} {profile.titles[0]}
              </p>
            )}
          </div>
          {!noResume && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh matches
            </Button>
          )}
        </div>

        {/* No resume state */}
        {noResume && (
          <EmptyState
            icon={FileText}
            title="Upload your resume to get personalized matches"
            description="We'll analyze your background and surface the most relevant jobs from across the web."
            action={
              <Button asChild>
                <Link href="/settings">Upload Resume in Settings</Link>
              </Button>
            }
          />
        )}

        {/* Loading skeletons */}
        {(isLoading || isFetching) && !noResume && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
              Analyzing your resume and finding best matches…
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          </div>
        )}

        {/* Job results */}
        {!isLoading && !isFetching && !noResume && jobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {jobs.length} jobs ranked by fit
              {profile?.skills.length ? ` · skills: ${profile.skills.slice(0, 4).join(", ")}` : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <div key={job.id} className="space-y-1">
                  {job.matchReason && (
                    <div className="flex items-center gap-1.5 px-1">
                      <Sparkles className="h-3 w-3 text-violet-500 shrink-0" />
                      <span className="text-xs text-violet-700 font-medium truncate">
                        {job.matchReason}
                      </span>
                    </div>
                  )}
                  <JobCard job={job} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty results (has resume but no jobs) */}
        {!isLoading && !isFetching && !noResume && jobs.length === 0 && data && (
          <EmptyState
            icon={Sparkles}
            title="No matches found"
            description="We couldn't find jobs matching your resume right now. Try refreshing or check back later."
            action={
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            }
          />
        )}

        {/* Skills tags */}
        {!isLoading && profile?.skills && profile.skills.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Skills detected from your resume:</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
