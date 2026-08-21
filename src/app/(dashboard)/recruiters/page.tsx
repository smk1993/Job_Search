"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { Users, Plus, Mail, Linkedin, MessageSquare, Trash2 } from "lucide-react";

interface RecruiterContact {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  linkedinUrl: string | null;
  redditUsername: string | null;
  notes: string | null;
}

export default function RecruitersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", linkedinUrl: "", redditUsername: "", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["recruiters"],
    queryFn: () => axios.get("/api/recruiters").then((r) => r.data),
  });

  const contacts: RecruiterContact[] = data?.contacts ?? [];

  const handleSave = async () => {
    try {
      await axios.post("/api/recruiters", form);
      toast.success("Contact saved!");
      setOpen(false);
      setForm({ name: "", email: "", company: "", linkedinUrl: "", redditUsername: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["recruiters"] });
    } catch {
      toast.error("Failed to save contact");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/recruiters?id=${id}`);
      toast.success("Contact deleted");
      queryClient.invalidateQueries({ queryKey: ["recruiters"] });
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div>
      <TopNav title="Recruiter Contacts" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recruiter Contacts</h2>
            <p className="text-sm text-muted-foreground">Keep track of recruiters you&apos;ve connected with</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recruiter Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {["name", "email", "company"].map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="capitalize">{field}</Label>
                    <Input
                      value={form[field as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={field === "email" ? "recruiter@company.com" : field === "name" ? "Jane Smith" : "Acme Corp"}
                      type={field === "email" ? "email" : "text"}
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label>LinkedIn URL</Label>
                  <Input value={form.linkedinUrl} onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-1">
                  <Label>Reddit Username</Label>
                  <Input value={form.redditUsername} onChange={(e) => setForm((f) => ({ ...f, redditUsername: e.target.value }))} placeholder="username (without u/)" />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Met at job fair, has senior roles open..." className="resize-none" />
                </div>
                <Button onClick={handleSave} className="w-full">Save Contact</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add recruiters you meet via job postings, LinkedIn, or Reddit to keep track of your network."
            action={
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />Add Your First Contact
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{contact.name ?? "Unknown"}</h3>
                      {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(contact.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.linkedinUrl && (
                      <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                        <Linkedin className="h-3.5 w-3.5 flex-shrink-0" />
                        LinkedIn
                      </a>
                    )}
                    {contact.redditUsername && (
                      <a href={`https://reddit.com/message/compose/?to=${contact.redditUsername}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-orange-600 hover:underline">
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                        u/{contact.redditUsername}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2 line-clamp-2">{contact.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
