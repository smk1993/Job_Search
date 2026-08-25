"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Linkedin,
} from "lucide-react";
import { COUNTRIES } from "@/lib/utils";
import type { ExtractedProfile } from "@/app/api/settings/resume/route";

const WORK_AUTH_OPTIONS = [
  {
    value: "CITIZEN",
    label: "Citizen / National",
    description: "Full work authorization — no restrictions",
  },
  {
    value: "PERMANENT_RESIDENT",
    label: "Permanent Resident",
    description: "Permanent residency — can work without sponsorship",
  },
  {
    value: "WORK_VISA",
    label: "Work Visa Holder",
    description: "Authorized to work via a valid work visa",
  },
  {
    value: "STUDENT_VISA",
    label: "Student Visa (with work authorization)",
    description: "Student visa with limited work rights (e.g., F1 OPT)",
  },
  {
    value: "NO_AUTHORIZATION",
    label: "Need Employer Sponsorship",
    description: "Require an employer to sponsor my work authorization",
  },
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

const LINKEDIN_ERRORS: Record<string, string> = {
  linkedin_denied: "LinkedIn connection was cancelled.",
  linkedin_state_mismatch: "Security check failed. Please try connecting again.",
  linkedin_failed: "Failed to connect LinkedIn. Please try again.",
  linkedin_not_configured: "LinkedIn integration is not yet configured.",
};

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("US");
  const [workAuthType, setWorkAuthType] = useState("NO_AUTHORIZATION");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeOriginalName, setResumeOriginalName] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);

  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [appliedFromCV, setAppliedFromCV] = useState(false);

  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [isLinkedinConnecting, setIsLinkedinConnecting] = useState(false);
  const [linkedinConfigured, setLinkedinConfigured] = useState<boolean | null>(null);

  const fetchSettings = () => {
    return axios.get("/api/settings").then((res) => {
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
        setHasResume(u.hasResume ?? !!u.resumeUrl);
        setProfileImage(u.image ?? null);
      }
    });
  };

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      axios.get("/api/auth/linkedin/status").then((r) => {
        setLinkedinConfigured(r.data.configured);
        if (r.data.connected) setLinkedinConnected(true);
      }).catch(() => setLinkedinConfigured(false)),
    ]).catch(() => {}).finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLinkedInMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    if (event.data?.type === "LINKEDIN_CONNECTED") {
      setIsLinkedinConnecting(false);
      setLinkedinConnected(true);
      const importedFields: string[] = event.data.imported
        ? (event.data.imported as string).split(",").filter(Boolean)
        : [];
      if (importedFields.length) {
        toast.success(`LinkedIn connected — imported ${importedFields.join(", ")}.`);
      } else {
        toast.success("LinkedIn connected.");
      }
      fetchSettings().catch(() => {});
      update({});
    } else if (event.data?.type === "LINKEDIN_ERROR") {
      setIsLinkedinConnecting(false);
      const errKey = event.data.error as string;
      toast.error(LINKEDIN_ERRORS[errKey] ?? "LinkedIn connection failed.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleLinkedInMessage);
    return () => window.removeEventListener("message", handleLinkedInMessage);
  }, [handleLinkedInMessage]);

  const handleConnectLinkedIn = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      "/api/auth/linkedin",
      "linkedin_oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      toast.error("Popup was blocked. Please allow popups and try again.");
      return;
    }

    setIsLinkedinConnecting(true);

    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed);
        setIsLinkedinConnecting(false);
      }
    }, 500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.patch("/api/settings", { name, bio, country, workAuthType, linkedinUrl, githubUrl, phone });
      await update({ name });
      toast.success("Settings saved.");
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
      setHasResume(true);
      setResumeOriginalName(res.data.originalName ?? file.name);

      const extracted: ExtractedProfile = res.data.extractedProfile;
      const hasAnyField = extracted && Object.values(extracted).some((v) => v !== null);
      if (hasAnyField) {
        setExtractedProfile(extracted);
        toast.success("CV uploaded — details found. Apply them to your profile below.");
      } else {
        toast.success("Resume uploaded.");
      }
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
    if (extractedProfile.name)        setName(extractedProfile.name);
    if (extractedProfile.phone)       setPhone(extractedProfile.phone);
    if (extractedProfile.linkedinUrl) setLinkedinUrl(extractedProfile.linkedinUrl);
    if (extractedProfile.githubUrl)   setGithubUrl(extractedProfile.githubUrl);
    if (extractedProfile.summary)     setBio(extractedProfile.summary);
    setAppliedFromCV(true);
    toast.success("Fields filled from CV — click Save Profile to keep them.");
  };

  const handleRemoveResume = async () => {
    setIsUploadingResume(true);
    try {
      await axios.delete("/api/settings/resume");
      setResumeUrl(null);
      setHasResume(false);
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
  const selectedAuth = WORK_AUTH_OPTIONS.find((o) => o.value === workAuthType);
  const needsSponsorship = workAuthType === "NO_AUTHORIZATION" || workAuthType === "WORK_VISA" || workAuthType === "STUDENT_VISA";

  const cvFields = extractedProfile
    ? (Object.entries(extractedProfile) as [keyof ExtractedProfile, string | null][]).filter(([, v]) => v !== null)
    : [];

  const avatarSrc = profileImage ?? session?.user?.image;

  return (
    <div>
      <TopNav title="Settings" />
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Profile, resume, and work authorization</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Resume Card ──────────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume / CV
                </CardTitle>
                <CardDescription>PDF or DOCX, max 5 MB — we&apos;ll auto-fill your profile from it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(resumeUrl || hasResume) ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {resumeOriginalName ?? `Resume.${resumeExt.toLowerCase()}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{resumeUrl ? resumeExt : "Stored in database"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {resumeUrl && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                          <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={isUploadingResume}>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Replace
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={handleRemoveResume} disabled={isUploadingResume}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/40 transition-colors">
                    {isUploadingResume ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Reading your CV…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm font-medium">Upload CV</p>
                        <p className="text-xs text-muted-foreground">PDF or DOCX · up to 5 MB</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={isUploadingResume} />
                  </label>
                )}

                {(resumeUrl || hasResume) && (
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={isUploadingResume} />
                )}

                {isUploadingResume && (resumeUrl || hasResume) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Reading your CV…
                  </div>
                )}

                {cvFields.length > 0 && !appliedFromCV && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <p className="text-xs font-medium text-violet-900">Details found in your CV</p>
                      </div>
                      <button onClick={() => setExtractedProfile(null)} className="text-violet-400 hover:text-violet-600 transition-colors" aria-label="Dismiss">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <dl className="grid grid-cols-1 gap-1">
                      {cvFields.map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <dt className="text-violet-600 font-medium whitespace-nowrap min-w-[120px]">{FIELD_LABELS[key]}</dt>
                          <dd className="text-violet-800 truncate">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <Button size="sm" onClick={handleApplyFromCV} className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1.5" />
                      Apply to Profile
                    </Button>
                  </div>
                )}

                {appliedFromCV && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Fields filled from CV — review below and save.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── LinkedIn Card ─────────────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                    LinkedIn
                  </CardTitle>

                  {linkedinConfigured === null ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : linkedinConfigured === false ? null : linkedinConnected ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">Connected</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleConnectLinkedIn}
                        disabled={isLinkedinConnecting}
                      >
                        {isLinkedinConnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reconnect"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2]/5 hover:border-[#0A66C2]"
                      onClick={handleConnectLinkedIn}
                      disabled={isLinkedinConnecting}
                    >
                      {isLinkedinConnecting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Linkedin className="h-3 w-3" />
                      )}
                      {isLinkedinConnecting ? "Connecting…" : "Connect"}
                    </Button>
                  )}
                </div>

                {linkedinConfigured === false && (
                  <CardDescription className="mt-1">
                    Add <code className="text-xs bg-muted px-1 py-0.5 rounded">LINKEDIN_CLIENT_ID</code> and{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">LINKEDIN_CLIENT_SECRET</code> to{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code> to enable.
                  </CardDescription>
                )}

                {linkedinConfigured === true && !linkedinConnected && (
                  <CardDescription className="mt-1">Syncs your profile photo.</CardDescription>
                )}
              </CardHeader>

              {linkedinConfigured === false && (
                <CardContent className="pt-0">
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>
                        <a href="https://www.linkedin.com/developers/apps/new" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                          Create a LinkedIn app
                        </a>
                      </li>
                      <li>Add redirect URL: <code className="bg-background px-1 rounded">/api/auth/linkedin/callback</code></li>
                      <li>Request <em>Sign In with LinkedIn using OpenID Connect</em> under Products</li>
                      <li>Copy Client ID &amp; Secret into <code className="bg-background px-1 rounded">.env.local</code></li>
                    </ol>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* ── Profile Form ──────────────────────────────────────────── */}
            <form onSubmit={handleSave} className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarSrc} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      {name && <p className="text-sm font-medium leading-none">{name}</p>}
                      <p className={`text-xs text-muted-foreground ${name ? "mt-1" : ""}`}>{session?.user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Full Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="h-9" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" type="tel" className="h-9" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">LinkedIn URL</Label>
                      <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/…" className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">GitHub URL</Label>
                      <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="github.com/…" className="h-9" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Professional Summary</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief summary used by AI when generating cover letters…"
                      className="min-h-[90px] resize-none text-sm"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{bio.length} / 500</p>
                  </div>
                </CardContent>
              </Card>

              {/* ── Work Authorization ────────────────────────────────── */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Work Authorization
                  </CardTitle>
                  <CardDescription>Controls job filtering on the Jobs page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      Country
                    </Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="h-9">
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
                    <Label className="text-xs font-medium">Authorization Status</Label>
                    <Select value={workAuthType} onValueChange={setWorkAuthType}>
                      <SelectTrigger className="h-9">
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

                  <div className={`rounded-md p-3 flex items-start gap-2.5 ${needsSponsorship ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
                    {needsSponsorship ? (
                      <ShieldX className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs">
                      {needsSponsorship ? (
                        <span className="text-orange-800">
                          Jobs requiring independent authorization will be filtered by default.
                        </span>
                      ) : (
                        <span className="text-green-800">
                          No sponsorship needed — all jobs shown by default.
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={isSaving} className="w-full">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Profile"}
              </Button>
            </form>

          </div>
        )}
      </div>
    </div>
  );
}
