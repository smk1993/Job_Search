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
    description: "Full work authorization in my country — no restrictions",
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
    description: "On a student visa with limited work rights (e.g., F1 OPT, Tier 4)",
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

  // Profile form fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("US");
  const [workAuthType, setWorkAuthType] = useState("NO_AUTHORIZATION");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Resume state
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeOriginalName, setResumeOriginalName] = useState<string | null>(null);

  // CV extraction state
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [appliedFromCV, setAppliedFromCV] = useState(false);

  // LinkedIn connection state
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [isLinkedinConnecting, setIsLinkedinConnecting] = useState(false);
  const [linkedinConfigured, setLinkedinConfigured] = useState<boolean | null>(null); // null = loading

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
        setProfileImage(u.image ?? null);
      }
    });
  };

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      axios.get("/api/auth/linkedin/status").then((r) => setLinkedinConfigured(r.data.configured)).catch(() => setLinkedinConfigured(false)),
    ]).catch(() => {}).finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle postMessage from the LinkedIn OAuth popup
  const handleLinkedInMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    if (event.data?.type === "LINKEDIN_CONNECTED") {
      setIsLinkedinConnecting(false);
      setLinkedinConnected(true);
      const importedFields: string[] = event.data.imported
        ? (event.data.imported as string).split(",").filter(Boolean)
        : [];
      const msg = importedFields.length
        ? `LinkedIn connected! Imported: ${importedFields.join(", ")}.`
        : "LinkedIn connected successfully.";
      toast.success(msg);
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
      toast.error("Popup was blocked. Please allow popups for this site and try again.");
      return;
    }

    setIsLinkedinConnecting(true);

    // Detect if user closes the popup without completing OAuth
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

      const extracted: ExtractedProfile = res.data.extractedProfile;
      const hasAnyField = extracted && Object.values(extracted).some((v) => v !== null);
      if (hasAnyField) {
        setExtractedProfile(extracted);
        toast.success("CV uploaded — we found some details you can apply to your profile.");
      } else {
        toast.success("Resume uploaded!");
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
    toast.success("Fields filled from your CV — click Save Profile to keep them.");
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
  const selectedAuth = WORK_AUTH_OPTIONS.find((o) => o.value === workAuthType);
  const needsSponsorship = workAuthType === "NO_AUTHORIZATION" || workAuthType === "WORK_VISA" || workAuthType === "STUDENT_VISA";

  // Fields found in CV
  const cvFields = extractedProfile
    ? (Object.entries(extractedProfile) as [keyof ExtractedProfile, string | null][]).filter(([, v]) => v !== null)
    : [];

  // Displayed avatar: LinkedIn photo from DB > session image > initials
  const avatarSrc = profileImage ?? session?.user?.image;

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

            {/* ── Resume Card ─────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resume / CV
                </CardTitle>
                <CardDescription>
                  Upload your CV (PDF or DOCX, max 5MB). We&apos;ll automatically read your details and fill in your profile.
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
                        <p className="text-xs text-muted-foreground">{resumeExt} · Uploaded</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={resumeUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingResume}>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Replace
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleRemoveResume} disabled={isUploadingResume} className="text-destructive hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    {isUploadingResume ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Reading your CV…</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload your CV</p>
                        <p className="text-xs text-muted-foreground">PDF or DOCX up to 5MB — we&apos;ll auto-fill your profile</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={isUploadingResume} />
                  </label>
                )}

                {/* Hidden input for Replace flow */}
                {resumeUrl && (
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={isUploadingResume} />
                )}

                {isUploadingResume && resumeUrl && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Reading your CV…
                  </div>
                )}

                {/* CV Extraction Banner */}
                {cvFields.length > 0 && !appliedFromCV && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                        <p className="text-sm font-medium text-violet-900">Details found in your CV</p>
                      </div>
                      <button onClick={() => setExtractedProfile(null)} className="text-violet-400 hover:text-violet-600 transition-colors" aria-label="Dismiss">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <dl className="grid grid-cols-1 gap-1.5">
                      {cvFields.map(([key, value]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <dt className="text-violet-600 font-medium whitespace-nowrap min-w-[130px]">{FIELD_LABELS[key]}:</dt>
                          <dd className="text-violet-800 truncate">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <Button size="sm" onClick={handleApplyFromCV} className="bg-violet-600 hover:bg-violet-700 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Apply to Profile
                    </Button>
                  </div>
                )}

                {appliedFromCV && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Profile filled from CV — review the fields below and click Save.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── LinkedIn Card ────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                  LinkedIn
                </CardTitle>
                <CardDescription>
                  Connect your LinkedIn account to import your profile photo and display name automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {linkedinConnected ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    LinkedIn connected — profile photo updated.
                  </div>
                ) : linkedinConfigured === false ? (
                  /* ── Not configured: show setup instructions ── */
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-amber-900">Setup required</p>
                    <p className="text-sm text-amber-800">
                      To enable LinkedIn sign-in, create a LinkedIn app and add your credentials to{" "}
                      <code className="bg-amber-100 px-1 rounded text-xs">.env.local</code>:
                    </p>
                    <pre className="text-xs bg-amber-100 rounded p-2 text-amber-900 select-all">
{`LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret`}
                    </pre>
                    <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                      <li>
                        Go to{" "}
                        <a href="https://www.linkedin.com/developers/apps/new" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                          linkedin.com/developers → Create App
                        </a>
                      </li>
                      <li>Under <strong>Auth</strong>, add redirect URL:<br />
                        <code className="bg-amber-100 text-xs">{process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/linkedin/callback</code>
                      </li>
                      <li>Under <strong>Products</strong>, request <em>Sign In with LinkedIn using OpenID Connect</em></li>
                      <li>Copy the Client ID &amp; Secret into your <code className="bg-amber-100">.env.local</code> and restart the server</li>
                    </ol>
                  </div>
                ) : linkedinConfigured === null ? (
                  /* Loading */
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking configuration…
                  </div>
                ) : (
                  /* Configured — show connect button */
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Imports: profile photo, display name</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/5"
                      onClick={handleConnectLinkedIn}
                      disabled={isLinkedinConnecting}
                    >
                      {isLinkedinConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Linkedin className="h-4 w-4" />
                      )}
                      {isLinkedinConnecting ? "Connecting…" : "Connect LinkedIn"}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Note: LinkedIn&apos;s public API does not expose project details or full summaries to third-party apps — add these manually below.
                </p>
              </CardContent>
            </Card>

            {/* ── Profile Form ─────────────────────────────────────────── */}
            <form onSubmit={handleSave} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarSrc} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session?.user?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {avatarSrc ? "Profile photo from LinkedIn" : "Connect LinkedIn to add a profile photo"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
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
                      placeholder="Brief professional summary — used by the AI when generating cover letters…"
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{bio.length}/500 — Used by AI when generating cover letters</p>
                  </div>
                </CardContent>
              </Card>

              {/* ── Work Authorization ───────────────────────────────── */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Work Authorization
                  </CardTitle>
                  <CardDescription>
                    Set your work authorization status. Jobs that explicitly require independent authorization (no sponsorship) can be filtered out.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      Country / Region
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
                    <Label>Work Authorization Status</Label>
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

                  <div className={`rounded-md p-3 flex items-start gap-3 ${needsSponsorship ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
                    {needsSponsorship ? (
                      <ShieldX className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">
                      {needsSponsorship ? (
                        <span className="text-orange-800">
                          <strong>Jobs requiring independent work authorization will be filtered.</strong>{" "}
                          You can toggle this filter per-search on the Jobs page.
                        </span>
                      ) : (
                        <span className="text-green-800">
                          You can work without sponsorship — all jobs will be shown by default.
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
