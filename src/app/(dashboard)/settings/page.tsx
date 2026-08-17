"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { Loader2, Shield, ShieldCheck, ShieldX, Globe } from "lucide-react";
import { COUNTRIES } from "@/lib/utils";

const WORK_AUTH_OPTIONS = [
  { value: "CITIZEN", label: "US Citizen", description: "Full work authorization, no restrictions" },
  { value: "PERMANENT_RESIDENT", label: "Permanent Resident (Green Card)", description: "Permanent work authorization" },
  { value: "WORK_VISA", label: "Work Visa (H1B, L1, etc.)", description: "May require sponsorship for new employers" },
  { value: "STUDENT_VISA", label: "Student Visa (F1/OPT/CPT)", description: "Limited work authorization" },
  { value: "NO_AUTHORIZATION", label: "No US Work Authorization", description: "Jobs requiring US work auth will be filtered" },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("US");
  const [workAuthType, setWorkAuthType] = useState("NO_AUTHORIZATION");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    axios.get("/api/settings").then((res) => {
      const u = res.data.user;
      if (u) {
        setName(u.name ?? "");
        setBio(u.bio ?? "");
        setCountry(u.country ?? "US");
        setWorkAuthType(u.workAuthType ?? "NO_AUTHORIZATION");
        setLinkedinUrl(u.linkedinUrl ?? "");
        setGithubUrl(u.githubUrl ?? "");
        setPhone(u.phone ?? "");
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.patch("/api/settings", { name, bio, country, workAuthType, linkedinUrl, githubUrl, phone });
      await update({ name });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const isNonUSUser = country !== "US";
  const selectedAuth = WORK_AUTH_OPTIONS.find((o) => o.value === workAuthType);
  const willFilterJobs =
    isNonUSUser &&
    (workAuthType === "NO_AUTHORIZATION" || workAuthType === "WORK_VISA" || workAuthType === "STUDENT_VISA");

  return (
    <div>
      <TopNav title="Settings" />
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Profile Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account and work authorization preferences</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief professional summary used for cover letter generation..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/500 — Used by AI when generating cover letters</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>LinkedIn URL</Label>
                    <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel" />
                </div>
              </CardContent>
            </Card>

            {/* Work Authorization */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Work Authorization
                </CardTitle>
                <CardDescription>
                  This controls which jobs are shown to you. Jobs requiring US authorization will be filtered if you cannot work there.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    Your Country
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>US Work Authorization Status</Label>
                  <Select value={workAuthType} onValueChange={setWorkAuthType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_AUTH_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          <div>
                            <p>{o.label}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAuth && (
                    <p className="text-xs text-muted-foreground">{selectedAuth.description}</p>
                  )}
                </div>

                {/* Live preview */}
                <div className={`rounded-md p-3 flex items-start gap-3 ${willFilterJobs ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
                  {willFilterJobs ? (
                    <ShieldX className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    {willFilterJobs ? (
                      <p className="text-orange-800">
                        <strong>Jobs requiring US work authorization will be filtered out.</strong>{" "}
                        This protects you from seeing jobs you&apos;re not eligible for.
                        You can toggle this filter per-search on the Jobs page.
                      </p>
                    ) : country === "US" ? (
                      <p className="text-green-800">You&apos;re in the US — all jobs are shown by default.</p>
                    ) : (
                      <p className="text-green-800">
                        Based on your work authorization status, you can work in the US. Jobs requiring US work auth will be shown.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Settings"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
