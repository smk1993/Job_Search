"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkAuthBadge } from "./WorkAuthBadge";
import {
  getWorkModeColor,
  getPlatformColor,
  getCompanyLogoUrl,
  truncate,
  formatRelativeDate,
} from "@/lib/utils";
import { Heart, ExternalLink, MapPin, DollarSign, Clock, CheckCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import type { JobWithAuthStatus } from "@/types/job";

const WORK_MODE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

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

interface JobCardProps {
  job: JobWithAuthStatus;
  onSaveToggle?: () => void;
}

export function JobCard({ job, onSaveToggle }: JobCardProps) {
  const [isSaved, setIsSaved] = useState(job.isSaved ?? false);
  const [isApplied, setIsApplied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      if (isSaved) {
        await axios.delete(`/api/jobs/save?sourceUrl=${encodeURIComponent(job.sourceUrl)}`);
        setIsSaved(false);
        toast.success("Removed from saved jobs");
      } else {
        await axios.post("/api/jobs/save", { job });
        setIsSaved(true);
        toast.success("Job saved!");
      }
      onSaveToggle?.();
    } catch {
      toast.error("Failed to update saved status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = async () => {
    // Open the job portal in a new tab immediately
    window.open(job.sourceUrl, "_blank", "noopener,noreferrer");

    // Track the application in the background
    setIsApplying(true);
    try {
      await axios.post("/api/applications", { job });
      setIsApplied(true);
      toast.success("Application tracked! Update your progress in Applications.");
    } catch {
      // Silently fail — opening the link is more important than tracking
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card
      className={`flex flex-col hover:shadow-md transition-shadow ${
        job.workAuthStatus === "blocked" ? "opacity-70" : ""
      }`}
    >
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getCompanyLogoUrl(job.company)}
            alt={job.company}
            className="h-10 w-10 rounded-md flex-shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">
              {job.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{job.company}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={toggleSave}
            disabled={isSaving}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"
              }`}
            />
          </Button>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{job.salary}</span>
            </div>
          )}
          {job.postedAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>{formatRelativeDate(job.postedAt)}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {job.workMode && (
            <Badge variant="secondary" className={`text-xs ${getWorkModeColor(job.workMode)}`}>
              {WORK_MODE_LABELS[job.workMode] ?? job.workMode}
            </Badge>
          )}
          {job.jobType && (
            <Badge variant="secondary" className="text-xs">
              {JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
            </Badge>
          )}
          <Badge variant="secondary" className={`text-xs ${getPlatformColor(job.sourcePlatform)}`}>
            {PLATFORM_LABELS[job.sourcePlatform] ?? job.sourcePlatform}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
          {truncate(job.description, 160)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <WorkAuthBadge status={job.workAuthStatus} reason={job.workAuthReason} />
          <Button
            size="sm"
            variant={isApplied ? "secondary" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplied ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                Applied
              </>
            ) : (
              <>
                <ExternalLink className="h-3 w-3" />
                Apply
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
