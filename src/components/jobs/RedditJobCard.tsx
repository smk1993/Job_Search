"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkAuthBadge } from "./WorkAuthBadge";
import { truncate, formatRelativeDate } from "@/lib/utils";
import {
  ExternalLink,
  Mail,
  Linkedin,
  MessageSquare,
  MapPin,
  DollarSign,
  Clock,
} from "lucide-react";
import type { JobWithAuthStatus } from "@/types/job";

interface RedditJobCardProps {
  job: JobWithAuthStatus;
}

export function RedditJobCard({ job }: RedditJobCardProps) {
  return (
    <Card className={job.workAuthStatus === "blocked" ? "opacity-70" : ""}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug">{job.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {job.subreddit && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-orange-100 text-orange-800"
                >
                  {job.subreddit}
                </Badge>
              )}
              {job.company && (
                <span className="text-sm text-muted-foreground">{job.company}</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-shrink-0"
            onClick={() =>
              window.open(job.sourceUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="h-3 w-3" />
            View Post
          </Button>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {job.salary}
            </span>
          )}
          {job.postedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeDate(job.postedAt)}
            </span>
          )}
          {job.authorUsername && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              u/{job.authorUsername}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-3">
          {truncate(job.description, 300)}
        </p>

        {/* Footer: Work auth + contacts */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
          <WorkAuthBadge status={job.workAuthStatus} reason={job.workAuthReason} />
          <div className="flex items-center gap-3">
            {job.contactEmail && (
              <a
                href={`mailto:${job.contactEmail}`}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            )}
            {job.contactLinkedin && (
              <a
                href={job.contactLinkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <Linkedin className="h-3 w-3" />
                LinkedIn
              </a>
            )}
            {job.authorUsername && (
              <a
                href={`https://news.ycombinator.com/user?id=${job.authorUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-600 hover:underline flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" />
                HN Profile
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
