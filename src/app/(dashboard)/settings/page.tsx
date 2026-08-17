"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";
import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldX,
  Globe,
  FileText,
  Upload,
  Download,
  X,
  User,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { COUNTRIES } from "@/lib/utils";
import type { ExtractedProfile } from "@/app/api/settings/resume/route";

const WORK_AUTH_OPTIONS = [
  { value: "CITIZEN", label: "US Citizen", description: "Full work authorization, no restrictions" },
  { value: "PERMANENT_RESIDENT", label: "Permanent Resident (Green Card)", description: "Permanent work authorization" },
  { value: "WORK_VISA", label: "Work Visa (H1B, L1, etc.)", description: "May require sponsorship for new employers" },
  { value: "STUDENT_VISA", label: "Student Visa (F1/OPT/CPT)", description: "Limited work authorization" },
  { value: "NO_AUTHORIZATION", label: "No US Work Authorization", description: "Jobs requiring US work auth will be filtered" },
];

const FIELD_LABELS: Record<keyof ExtractedProfile, string> = {
  name: "Full Name",
  phone: "Phone",
  email: "Email",
  linkedinUrl: "LinkedIn URL",
  githubUrl: "GitHub URL",
  location: "Location",
  summary: "Professional Summary",
};

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("US");
  const [workAuthType, setWorkAuthType] = useState("NO_AUTHORIZATION");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [phone, setPhone] = useState("");

  // Resume state
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeOriginalName, setResumeOriginalName] = useState<string | null>(null);

  // CV extraction state
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [appliedFromCV, setAppliedFromCV] = useState(false);

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
        setResumeUrl(u.resumeUrl ?? null);
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

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingResume(true);
    setExtractedProfile(null);
    setAppliedFromCV(false);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await axios.post("/api/settings/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResumeUrl(res.data.resumeUrl);
      setResumeOriginalName(res.data.originalName ?? file.name);

      // Show extracted profile if any field was found
      const extracted: ExtractedProfile = res.data.extractedProfile;
      const hasAnyField = extracted && Object.values(extracted).some((v) => v !== null);
      if (hasAnyField) {
        setExtractedProfile(extracted);
      }

      toast.success("Resume uploaded!");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
      toast.error(msg ?? "Failed to upload resume");
    } finally {
      setIsUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyFromCV = () => {
    if (!extractedProfile) return;
    if (extractedProfile.name)       setName(extractedProfile.name);
    if (extractedProfile.phone)      setPhone(extractedProfile.phone);
    if (extractedProfile.linkedinUrl) setLinkedinUrl(extractedProfile.linkedinUrl);
    if (extractedProfile.githubUrl)  setGithubUrl(extractedProfile.githubUrl);
    if (extractedProfile.summary)    setBio(extractedProfile.summary);
    setAppliedFromCV(true);
    toast.success("Profile fields filled from your CV — click Save to keep them.");
  };

  const handleRemoveResume = async () => {
    setIsUploadingResume(true);
    try {
      await axios.delete("/api/settings/resume");
      setResumeUrl(null);
      setResumeOriginalName(null);
      setExtractedProfile(null);
      setAppliedFromCV(false);
      toast.success("Resume removed");
    } catch {
      toast.error("Failed to remove resume");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const resumeExt = resumeUrl?.split(".").pop()?.toUpperCase() ?? "PDF";

  const isNonUSUser = country !== "US";
  const selectedAuth = WORK_AUTH_OPTIONS.find((o) => o.value === workAuthType);
  const willFilterJobs =
    isNonUSUser &&
    (workAuthType === "NO_AUTHORIZATION" || workAuthType === "WORK_VISA" || workAuthType === "STUDENT_VISA");

  // Fields found in CV that are non-null
  const cvFields = extractedProfile
    ? (Object.entries(extractedProfile) as [keyof ExtractedProfile, string | null][]).filter(([, v]) => v !== null)
    : [];

  return (
    <div>
      <TopNav title="Settings" />
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Profile Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account, resume, and work authorization preferences</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Resume Card (above form so extraction banner appears near top) ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume
                </CardTitle>
                <CardDescription>
                  Upload your resume (PDF, DOCX — max 5MB). We&apos;ll auto-fill your profile details from it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {resumeUrl ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {resumeOriginalName ?? `Resume.${resumeExt.toLowerCase()}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{resumeExt} file · Uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingResume}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Replace
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveResume}
                        disabled={isUploadingResume}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    {isUploadingResume ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Uploading &amp; reading your CV…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload your resume</p>
                        <p className="text-xs text-muted-foreground">PDF or DOCX up to 5MB</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      disabled={isUploadingResume}
                    />
                  </label>
                )}

                {/* Hidden input for Replace flow */}
                {resumeUrl && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={isUploadingResume}
                  />
                )}

                {isUploadingResume && resumeUrl && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading &amp; reading your CV…
                  </div>
                )}

                {/* ── CV Extraction Banner ───────────────────────────────── */}
                {cvFields.length > 0 && !appliedFromCV && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                        <p className="text-sm font-medium text-violet-900">
                          We found these details in your CV
                        </p>
                      </div>
                      <button
                        onClick={() => setExtractedProfile(null)}
                        className="text-violet-400 hover:text-violet-600 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <dl className="grid grid-cols-1 gap-1.5">
                      {cvFields.map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <dt className="text-violet-600 font-medium whitespace-nowrap min-w-[120px]">
                            {FIELD_LABELS[key]}:
                          </dt>
                          <dd className="text-violet-800 truncate">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <Button
                      size="sm"
                      onClick={handleApplyFromCV}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Apply to Profile
                    </Button>
                  </div>
                )}

                {appliedFromCV && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Profile fields filled from CV — review below and click Save.
                  </div>
                )}
              </CardContent>
            </Card>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {session?.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.user.image} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session?.user?.email}</p>
                      <p className="text-xs text-muted-foreground">Logged in via Google or email</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel" />
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
                    <Label>Professional Summary</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief professional summary used for AI cover letter generation…"
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{bio.length}/500 — Used by AI when generating cover letters</p>
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
                    Controls which jobs are shown to you. Jobs requiring US authorization will be filtered if you cannot work there.
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
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAuth && (
                      <p className="text-xs text-muted-foreground">{selectedAuth.description}</p>
                    )}
                  </div>

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
                          You can toggle this filter per-search on the Jobs page.
                        </p>
                      ) : country === "US" ? (
                        <p className="text-green-800">You&apos;re in the US — all jobs are shown by default.</p>
                      ) : (
                        <p className="text-green-800">
                          Based on your work authorization status, you can work in the US. All jobs will be shown.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
