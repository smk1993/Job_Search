"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Copy, Download, Wand2, Link2, CheckCircle2, Building2, Briefcase } from "lucide-react";

interface FetchedJob {
  title: string;
  company: string;
  description: string;
}

export default function CoverLettersPage() {
  const [url, setUrl] = useState("");
  const [fetchedJob, setFetchedJob] = useState<FetchedJob | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [tone, setTone] = useState("professional");
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const wordCount = coverLetter.trim().split(/\s+/).filter(Boolean).length;

  const handleFetchJob = async () => {
    if (!url.trim()) {
      toast.error("Please enter a job URL");
      return;
    }
    setIsFetching(true);
    setFetchedJob(null);
    setCoverLetter("");
    try {
      const res = await fetch("/api/cover-letter/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to fetch job details");
        return;
      }
      setFetchedJob(data);
      toast.success("Job details fetched!");
    } catch {
      toast.error("Failed to fetch job. Check the URL and try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleGenerate = async () => {
    if (!fetchedJob) return;
    setIsGenerating(true);
    setCoverLetter("");
    try {
      const jobRes = await fetch("/api/jobs/create-temp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fetchedJob.title,
          company: fetchedJob.company,
          description: fetchedJob.description,
        }),
      });
      if (!jobRes.ok) {
        toast.error("Could not initialize job. Please try again.");
        return;
      }
      const { jobId } = await jobRes.json();

      const response = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tone }),
      });
      if (!response.ok || !response.body) throw new Error("Failed to start generation");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setCoverLetter(accumulated);
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }
      toast.success("Cover letter generated!");
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Failed to generate cover letter");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([coverLetter], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `cover-letter-${fetchedJob?.company.toLowerCase().replace(/\s+/g, "-") ?? "download"}.txt`;
    a.click();
    URL.revokeObjectURL(objectUrl);
    toast.success("Downloaded!");
  };

  return (
    <div>
      <TopNav title="Cover Letter Studio" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-4">

            {/* Step 1 — URL input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Step 1 — Paste Job URL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Job Listing URL</Label>
                  <Input
                    placeholder="https://jobs.example.com/software-engineer"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !isFetching && handleFetchJob()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Works with Indeed, Glassdoor, company career pages, and most public job boards. LinkedIn requires login and cannot be fetched automatically.
                  </p>
                </div>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={handleFetchJob}
                  disabled={isFetching || !url.trim()}
                >
                  {isFetching ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Fetching job details...</>
                  ) : (
                    <><Link2 className="h-4 w-4" /> Fetch Job Details</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Step 2 — Job preview + generate (shown after fetch) */}
            {fetchedJob && (
              <Card className="border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Step 2 — Generate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{fetchedJob.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{fetchedJob.company}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full gap-2" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 className="h-4 w-4" /> Generate Cover Letter</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel — output */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Generated Cover Letter</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={!coverLetter} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={!coverLetter} className="gap-1">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {isGenerating && !coverLetter ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  <Textarea
                    className="flex-1 min-h-[500px] resize-none text-sm leading-relaxed font-[Georgia,serif]"
                    placeholder="Paste a job URL on the left and click Fetch Job Details, then Generate Cover Letter..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                )}
                {coverLetter && (
                  <p className="text-xs text-muted-foreground mt-2 text-right">{wordCount} words</p>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
