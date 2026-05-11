import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Job = {
  id: string;
  title: string;
  company: string;
  employer_id?: string | null;
  match_score?: number;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(6, "Phone is required").max(30),
  skills: z.string().trim().min(2, "List at least one skill").max(500),
  experience: z.string().trim().min(2, "Experience is required").max(2000),
  education: z.string().trim().min(2, "Education is required").max(1000),
  portfolio_url: z.string().trim().url("Must be a valid URL").max(300).or(z.literal("")),
  cover_letter: z.string().trim().min(20, "Cover letter must be at least 20 characters").max(3000),
});

type Props = {
  job: Job | null;
  resumeId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApplied: (jobId: string) => void;
};

export const ApplyJobDialog = ({ job, resumeId, open, onOpenChange, onApplied }: Props) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [latestResume, setLatestResume] = useState<{ id: string; file_name: string; file_path: string | null } | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    skills: "",
    experience: "",
    education: "",
    portfolio_url: "",
    cover_letter: "",
  });

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: profile }, { data: resume }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        resumeId
          ? supabase.from("resumes").select("id, file_name, file_path, skills").eq("id", resumeId).maybeSingle()
          : supabase.from("resumes").select("id, file_name, file_path, skills").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setLatestResume(resume ? { id: resume.id, file_name: resume.file_name, file_path: resume.file_path } : null);
      setForm((f) => ({
        ...f,
        full_name: f.full_name || profile?.full_name || "",
        email: f.email || user.email || "",
        skills: f.skills || (Array.isArray(resume?.skills) ? (resume!.skills as string[]).join(", ") : ""),
      }));
    })();
  }, [open, user, resumeId]);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!user || !job) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);

    let useResumeId = latestResume?.id ?? null;

    // Optional new resume upload
    if (resumeFile) {
      const path = `${user.id}/${Date.now()}-${resumeFile.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, resumeFile, { upsert: false });
      if (upErr) { toast.error(upErr.message); setSubmitting(false); return; }
      const { data: inserted, error: insErr } = await supabase
        .from("resumes")
        .insert({ user_id: user.id, file_name: resumeFile.name, file_path: path })
        .select("id")
        .single();
      if (insErr) { toast.error(insErr.message); setSubmitting(false); return; }
      useResumeId = inserted.id;
    }

    if (!useResumeId) {
      toast.error("Please upload a resume to apply");
      setSubmitting(false);
      return;
    }

    const skillsArr = parsed.data.skills.split(",").map((s) => s.trim()).filter(Boolean);

    const { error } = await supabase.from("job_applications").insert({
      user_id: user.id,
      job_id: job.id,
      resume_id: useResumeId,
      match_score: job.match_score ?? null,
      status: "applied",
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      skills: skillsArr,
      experience: parsed.data.experience,
      education: parsed.data.education,
      portfolio_url: parsed.data.portfolio_url || null,
      cover_letter: parsed.data.cover_letter,
    });

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Notify employer (best-effort)
    try {
      if (job.employer_id) {
        await supabase.from("notifications").insert({
          user_id: job.employer_id,
          type: "applicant",
          title: "New applicant",
          body: `${parsed.data.full_name} applied to ${job.title}${job.match_score != null ? ` (${job.match_score}% match)` : ""}`,
          link: "/employer/applicants",
        });
      }
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "application",
        title: "Application submitted",
        body: `Your application to ${job.title} at ${job.company} has been submitted.`,
        link: "/app/applied",
      });
    } catch { /* non-blocking */ }

    setSubmitting(false);
    toast.success("Application submitted successfully.");
    onApplied(job.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Apply for {job?.title}</DialogTitle>
          <DialogDescription>{job?.company} · Fill in your details below to submit your application.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" value={form.full_name} onChange={setField("full_name")} placeholder="Jane Doe" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={setField("email")} placeholder="you@example.com" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={form.phone} onChange={setField("phone")} placeholder="+1 555 555 5555" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="portfolio_url">Portfolio / LinkedIn</Label>
              <Input id="portfolio_url" value={form.portfolio_url} onChange={setField("portfolio_url")} placeholder="https://linkedin.com/in/…" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Resume *</Label>
            {latestResume && !resumeFile && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-secondary" />
                <span className="truncate">Using latest: <span className="font-medium">{latestResume.file_name}</span></span>
                <CheckCircle2 className="h-4 w-4 text-success ml-auto" />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <Upload className="h-4 w-4" />
              <span>{resumeFile ? resumeFile.name : (latestResume ? "Upload a different resume" : "Upload PDF / DOCX")}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skills">Skills * <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
            <Input id="skills" value={form.skills} onChange={setField("skills")} placeholder="React, TypeScript, Node.js" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="experience">Experience *</Label>
            <Textarea id="experience" rows={3} value={form.experience} onChange={setField("experience")} placeholder="e.g. 3 years as a Frontend Engineer at Acme…" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="education">Education *</Label>
            <Textarea id="education" rows={2} value={form.education} onChange={setField("education")} placeholder="B.Sc. Computer Science, MIT, 2022" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="cover_letter">Cover letter / short intro *</Label>
            <Textarea id="cover_letter" rows={4} value={form.cover_letter} onChange={setField("cover_letter")} placeholder="Why are you a great fit for this role?" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="hero" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
