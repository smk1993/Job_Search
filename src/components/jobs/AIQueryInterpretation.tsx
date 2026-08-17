"use client";

import { Sparkles } from "lucide-react";

interface AIQueryInterpretationProps {
  interpretation: string;
  confidence: number;
}

export function AIQueryInterpretation({ interpretation, confidence }: AIQueryInterpretationProps) {
  if (!interpretation) return null;

  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm">
      <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-violet-900">AI understood: </span>
        <span className="text-violet-800">{interpretation}</span>
      </div>
      {confidencePct < 80 && (
        <span className="text-xs text-violet-500 whitespace-nowrap shrink-0">
          {confidencePct}% confidence
        </span>
      )}
    </div>
  );
}
