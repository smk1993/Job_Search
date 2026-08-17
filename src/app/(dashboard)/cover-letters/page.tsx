"use client";

import { useState, useRef } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Copy, Download, Wand2, FileText } from "lucide-react";

export default function CoverLettersPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [customInstructions, setCustomInstructions] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const wordCount = coverLetter.trim().split(/\s+/).filter(Boolean).length;

  const handleGenerate = async () => {
    if (!jobTitle || !company || !jobDescription) {
      toast.error("Please fill in job title, company, and description");
      return;
    }

    // Create or upsert a job first (simplified: use a placeholder approach)
    setIsGenerating(true);
    setCoverLetter("");

    try {
      // First, create a temporary job in the DB
      const jobRes = await fetch("/api/jobs/create-temp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: jobTitle, company, description: jobDescription }),
      });

      let jobId: string;
      if (jobRes.ok) {
        const jobData = await jobRes.json();
        jobId = jobData.jobId;
      } else {
        // Fallback: use a fake jobId and send description inline
        toast.error("Could not initialize job. Try searching for the job first.");
        setIsGenerating(false);
        return;
      }

      abortRef.current = new AbortController();

      const response = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, tone, customInstructions }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start generation");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
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
              // ignore parse errors
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${company.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  return (
    <div>
      <TopNav title="Cover Letter Studio" />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          {/* Left Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Job Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input placeholder="Senior Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Input placeholder="Acme Corp" value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Job Description *</Label>
                  <Textarea
                    placeholder="Paste the full job description here..."
                    className="min-h-[150px] resize-none text-xs"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                <Separator />

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

                <div className="space-y-2">
                  <Label>Custom Instructions (optional)</Label>
                  <Textarea
                    placeholder="e.g. Emphasize my open-source contributions, mention I speak Spanish..."
                    className="min-h-[80px] resize-none text-xs"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">{customInstructions.length}/1000</p>
                </div>

                <Button className="w-full gap-2" onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Wand2 className="h-4 w-4" />Generate with AI</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Generated Cover Letter</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={!coverLetter} className="gap-1">
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={!coverLetter} className="gap-1">
                    <Download className="h-3.5 w-3.5" />
                    Download
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
                    className="flex-1 min-h-[400px] resize-none text-sm leading-relaxed font-[Georgia,serif]"
                    placeholder="Your AI-generated cover letter will appear here. Fill in the job details on the left and click Generate..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                )}
                {coverLetter && (
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {wordCount} words
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
