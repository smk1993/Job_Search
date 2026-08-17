"use client";

import { TopNav } from "@/components/layout/TopNav";
import { useSavedJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { JobWithAuthStatus } from "@/types/job";

export default function SavedJobsPage() {
  const { data, isLoading, refetch } = useSavedJobs();
  const jobs: JobWithAuthStatus[] = data?.jobs ?? [];

  return (
    <div>
      <TopNav title="Saved Jobs" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Saved Jobs</h2>
            <p className="text-sm text-muted-foreground">{jobs.length} job{jobs.length !== 1 ? "s" : ""} saved</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved jobs yet"
            description="Save jobs you&apos;re interested in and they'll appear here for easy access."
            action={
              <Button asChild>
                <Link href="/jobs">Search Jobs</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onSaveToggle={() => refetch()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
