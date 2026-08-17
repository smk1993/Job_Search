"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { JobCard } from "@/components/jobs/JobCard";
import { AIQueryInterpretation } from "@/components/jobs/AIQueryInterpretation";
import { SearchSummaryBar } from "@/components/jobs/SearchSummaryBar";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/useJobs";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, BriefcaseIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { JobWithAuthStatus } from "@/types/job";

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [applyWorkAuthFilter, setApplyWorkAuthFilter] = useState(true);
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isFetching } = useJobs({
    q: debouncedQuery,
    workMode,
    jobType,
    page,
    applyWorkAuthFilter,
    includeHN: false,
  });

  const jobs: JobWithAuthStatus[] = data?.jobs ?? [];
  const interpretation: string | null = data?.interpretation ?? null;
  const confidence: number = data?.confidence ?? 0;
  const freeSourceCount: number = data?.freeSourceCount ?? 0;
  // jsearchCount is used to determine if there's a next page
  // (free-source results are page-1-only and don't have more pages)
  const jsearchCount: number = data?.jsearchCount ?? 0;

  const isSearching = query !== debouncedQuery || isFetching;

  // Build per-platform counts for the summary bar
  const platformCounts = jobs.reduce<Record<string, number>>((acc, job) => {
    const p = job.sourcePlatform ?? "Other";
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});
  const sourceCounts = Object.entries(platformCounts).map(([platform, count]) => ({ platform, count }));

  return (
    <div>
      <TopNav title="Search Jobs" />
      <div className="p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search jobs… e.g. React engineer, Python developer, remote product manager"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          {isSearching && debouncedQuery && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* AI Interpretation */}
        {interpretation && debouncedQuery && (
          <AIQueryInterpretation interpretation={interpretation} confidence={confidence} />
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Work Mode</Label>
            <Select value={workMode} onValueChange={(v) => { setWorkMode(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="REMOTE">Remote</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
                <SelectItem value="ONSITE">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Job Type</Label>
            <Select value={jobType} onValueChange={(v) => { setJobType(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="FREELANCE">Freelance</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="work-auth-filter"
              checked={applyWorkAuthFilter}
              onCheckedChange={setApplyWorkAuthFilter}
            />
            <Label htmlFor="work-auth-filter" className="text-sm cursor-pointer whitespace-nowrap">
              Hide jobs I can&apos;t work
            </Label>
          </div>
        </div>

        {/* Results */}
        {!debouncedQuery.trim() ? (
          <EmptyState
            icon={Search}
            title="Search for your next opportunity"
            description="Enter a job title, skill, or company name to search across LinkedIn, Indeed, Glassdoor, Remotive, RemoteOK, Arbeitnow, and more."
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={BriefcaseIcon}
            title="No jobs found"
            description={
              applyWorkAuthFilter
                ? "Try disabling the work authorization filter to see more results."
                : "Try different keywords or filters."
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
            <SearchSummaryBar
              totalCount={jobs.length}
              sourceCounts={sourceCounts}
              isFetching={isFetching}
              query={debouncedQuery}
            />
            {freeSourceCount > 0 && !isFetching && (
              <p className="text-xs text-muted-foreground -mt-2">
                Includes {freeSourceCount} results from Remotive, RemoteOK &amp; Arbeitnow
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Pagination — driven by jsearchCount so free-source-only pages don't
                falsely suggest there's a next page */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={jsearchCount < 10}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
