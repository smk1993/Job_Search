"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldX } from "lucide-react";

interface WorkAuthBadgeProps {
  status: "ok" | "blocked";
  reason: string | null;
}

export function WorkAuthBadge({ status, reason }: WorkAuthBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium cursor-default ${
              status === "ok" ? "text-green-600" : "text-orange-600"
            }`}
          >
            {status === "ok" ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldX className="h-3.5 w-3.5" />
            )}
            {status === "ok" ? "Eligible" : "May need US auth"}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {status === "ok"
            ? "You appear eligible to apply for this job"
            : (reason ?? "This job may require US work authorization")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
