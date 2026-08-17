"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { useApplications } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatRelativeDate, getWorkModeColor, cn } from "@/lib/utils";
import { Briefcase, ExternalLink, MapPin, Clock } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const STATUSES = ["SAVED", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] as const;
type Status = typeof STATUSES[number];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  SAVED:        { label: "Saved",        color: "text-slate-700",  bg: "bg-slate-100" },
  APPLIED:      { label: "Applied",      color: "text-blue-700",   bg: "bg-blue-100" },
  PHONE_SCREEN: { label: "Phone Screen", color: "text-purple-700", bg: "bg-purple-100" },
  INTERVIEW:    { label: "Interview",    color: "text-yellow-700", bg: "bg-yellow-100" },
  OFFER:        { label: "Offer",        color: "text-green-700",  bg: "bg-green-100" },
  REJECTED:     { label: "Rejected",     color: "text-red-700",    bg: "bg-red-100" },
  WITHDRAWN:    { label: "Withdrawn",    color: "text-gray-700",   bg: "bg-gray-100" },
};

interface Application {
  id: string;
  status: Status;
  appliedAt: string;
  notes: string | null;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    workMode: string | null;
    sourcePlatform: string;
    sourceUrl: string;
  };
}

export default function ApplicationsPage() {
  const { data, isLoading, refetch } = useApplications();
  const applications: Application[] = data?.applications ?? [];
  const [updating, setUpdating] = useState<string | null>(null);

  const updateStatus = async (id: string, status: Status) => {
    setUpdating(id);
    try {
      await axios.patch("/api/applications", { id, status });
      await refetch();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const grouped = STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter((a) => a.status === status);
    return acc;
  }, {} as Record<Status, Application[]>);

  return (
    <div>
      <TopNav title="Application Tracker" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your Applications</h2>
            <p className="text-sm text-muted-foreground">Track and update your job application statuses</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <Badge key={s} variant="secondary" className={cn("text-xs", STATUS_CONFIG[s].bg, STATUS_CONFIG[s].color)}>
                {STATUS_CONFIG[s].label}: {grouped[s]?.length ?? 0}
              </Badge>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="When you apply to jobs, they'll appear here for tracking."
          />
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <div>
                          <h3 className="font-medium text-sm">{app.job.title}</h3>
                          <p className="text-muted-foreground text-sm">{app.job.company}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {app.job.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{app.job.location}</span>
                        )}
                        {app.job.workMode && (
                          <Badge variant="secondary" className={cn("text-xs", getWorkModeColor(app.job.workMode))}>
                            {app.job.workMode}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Applied {formatRelativeDate(app.appliedAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value as Status)}
                        disabled={updating === app.id}
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer",
                          STATUS_CONFIG[app.status]?.bg,
                          STATUS_CONFIG[app.status]?.color
                        )}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => window.open(app.job.sourceUrl, "_blank", "noopener,noreferrer")}>
                        <ExternalLink className="h-3 w-3" />
                        View Job
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
