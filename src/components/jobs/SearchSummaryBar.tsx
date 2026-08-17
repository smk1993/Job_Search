"use client";

import { Badge } from "@/components/ui/badge";
import { getPlatformColor } from "@/lib/utils";

interface SourceCount {
  platform: string;
  count: number;
}

interface SearchSummaryBarProps {
  totalCount: number;
  sourceCounts: SourceCount[];
  isFetching: boolean;
  query: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  INDEED: "Indeed",
  GLASSDOOR: "Glassdoor",
  ZIPRECRUITER: "ZipRecruiter",
  REMOTIVE: "Remotive",
  REMOTEOK: "RemoteOK",
  ARBEITNOW: "Arbeitnow",
  HACKERNEWS: "HN",
  OTHER: "Other",
};

export function SearchSummaryBar({ totalCount, sourceCounts, isFetching, query }: SearchSummaryBarProps) {
  if (!query) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        {isFetching ? "Searching…" : `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
      </span>
      {!isFetching && sourceCounts.filter((s) => s.count > 0).map(({ platform, count }) => (
        <Badge
          key={platform}
          variant="secondary"
          className={`text-xs ${getPlatformColor(platform)}`}
        >
          {PLATFORM_LABELS[platform] ?? platform} · {count}
        </Badge>
      ))}
    </div>
  );
}
