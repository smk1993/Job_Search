"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Send, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "SENT" | "FAILED" | "BOUNCED";
}

export default function EmailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["email-history"],
    queryFn: () => axios.get("/api/email/history").then((r) => r.data),
  });

  const emails: EmailLog[] = data?.emails ?? [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSending(true);
    try {
      await axios.post("/api/email/send", { to, subject, body });
      toast.success(`Email sent to ${to}!`);
      setTo("");
      setSubject("");
      setBody("");
      refetch();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to send email";
      toast.error(typeof msg === "string" ? msg : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "SENT") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "FAILED") return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div>
      <TopNav title="Email Recruiter" />
      <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Composer */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                Compose Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to">To *</Label>
                  <Input id="to" type="email" placeholder="recruiter@company.com" value={to} onChange={(e) => setTo(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input id="subject" placeholder="Application for Senior Engineer role" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message *</Label>
                  <Textarea
                    id="body"
                    placeholder="Dear Hiring Manager,&#10;&#10;I came across the job posting for..."
                    className="min-h-[280px] resize-none"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">{body.length} characters</p>
                </div>

                <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                  <p>Emails are sent via Resend from your configured domain. Make sure your <strong>RESEND_FROM_EMAIL</strong> and domain are verified.</p>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSending}>
                  {isSending ? (
                    <><span className="animate-pulse">Sending...</span></>
                  ) : (
                    <><Send className="h-4 w-4" />Send Email</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Email History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Sent Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
              ) : emails.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No emails sent yet
                </div>
              ) : (
                emails.map((email) => (
                  <div key={email.id} className="border rounded-md p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{email.recipientEmail}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {statusIcon(email.status)}
                        <Badge variant="outline" className="text-xs capitalize">{email.status.toLowerCase()}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(email.sentAt)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
