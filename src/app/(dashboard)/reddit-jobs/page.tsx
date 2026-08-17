"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RedditJobCard } from "@/components/jobs/RedditJobCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useRedditJobs } from "@/hooks/useJobs";
import { MessageSquare, RefreshCw } from "lucide-react";
import type { JobWithAuthStatus } from "@/types/job";

const HN_THREADS = [
  { value: undefined, label: "All" },
  { value: "who-is-hiring", label: "Who's Hiring" },
  { value: "who-wants-to-be-hired", label: "Who Wants to be Hired" },
];

export default function RedditJobsPage() {
  const [subreddit, setSubreddit] = useState<string | undefined>(undefined);
  const [applyWorkAuthFilter, setApplyWorkAuthFilter] = useState(true);

  const { data, isLoading, refetch, isFetching } = useRedditJobs(subreddit, applyWorkAuthFilter);
  const jobs: JobWithAuthStatus[] = data?.jobs ?? [];

  return (
    <div>
      <TopNav title="Hacker News Jobs" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Jobs from Hacker News</h2>
            <p className="text-sm text-muted-foreground">
              From monthly &quot;Ask HN: Who is Hiring?&quot; threads. Reply directly on HN.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="reddit-auth-filter" checked={applyWorkAuthFilter} onCheckedChange={setApplyWorkAuthFilter} />
              <Label htmlFor="reddit-auth-filter" className="text-sm cursor-pointer whitespace-nowrap">
                Hide ineligible jobs
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={subreddit ?? "all"} onValueChange={(v) => setSubreddit(v === "all" ? undefined : v)}>
          <TabsList>
            {HN_THREADS.map((thread) => (
              <TabsTrigger key={thread.value ?? "all"} value={thread.value ?? "all"}>
                {thread.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No Hacker News jobs found"
            description={
              applyWorkAuthFilter
                ? "No eligible jobs found. Try disabling the work authorization filter."
                : "No job posts found. Try refreshing or checking a different subreddit."
            }
            action={
              applyWorkAuthFilter ? (
                <Button variant="outline" onClick={() => setApplyWorkAuthFilter(false)}>
                  Show all jobs
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{jobs.length} posts found</p>
            {jobs.map((job) => (
              <RedditJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
