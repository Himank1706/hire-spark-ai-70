import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Users, Star, FileText, Mail, Phone, Link2, Calendar } from "lucide-react";
import { toast } from "sonner";

type App = {
  id: string;
  status: string;
  match_score: number | null;
  created_at: string;
  user_id: string;
  job_id: string;
  resume_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  experience: string | null;
  education: string | null;
  portfolio_url: string | null;
  cover_letter: string | null;
};

type Job = { id: string; title: string; required_skills: string[] };
type Resume = { id: string; user_id: string; ats_score: number | null; skills: string[]; file_name: string; file_path: string | null };

const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

const STATUS_COLOR: Record<string, string> = {
  applied: "bg-muted text-foreground",
  under_review: "bg-secondary/15 text-secondary",
  shortlisted: "bg-success/15 text-success",
  interview_scheduled: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  hired: "bg-success text-success-foreground",
};

const scoreTone = (s: number | null) => {
  if (s == null) return "text-muted-foreground";
  if (s >= 70) return "text-success";
  if (s >= 40) return "text-secondary";
  return "text-destructive";
};

const Applicants = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [resumes, setResumes] = useState<Record<string, Resume>>({});
  const [filterJob, setFilterJob] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<App | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title, required_skills")
      .eq("employer_id", user.id);
    const jobList = (jobsData ?? []) as Job[];
    setJobs(jobList);

    if (jobList.length === 0) { setApps([]); setLoading(false); return; }
    const jobIds = jobList.map((j) => j.id);

    const { data: appData } = await supabase
      .from("job_applications")
      .select("id, status, match_score, created_at, user_id, job_id, resume_id, full_name, email, phone, skills, experience, education, portfolio_url, cover_letter")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false });
    const appList = (appData ?? []) as any as App[];
    setApps(appList);

    const resumeIds = Array.from(new Set(appList.map((a) => a.resume_id).filter(Boolean))) as string[];
    if (resumeIds.length) {
      const { data: r } = await supabase.from("resumes").select("id, user_id, ats_score, skills, file_name, file_path").in("id", resumeIds);
      const map: Record<string, Resume> = {};
      (r ?? []).forEach((x: any) => { map[x.id] = x; });
      setResumes(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("emp-applicants")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_applications" }, (payload) => {
        if (payload.eventType === "INSERT") toast.message("New applicant just applied");
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filtered = useMemo(() => {
    return filterJob === "all" ? apps : apps.filter((a) => a.job_id === filterJob);
  }, [apps, filterJob]);

  const setStatus = async (a: App, status: string) => {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    setApps((p) => p.map((x) => x.id === a.id ? { ...x, status } : x));
    // notify the candidate
    const job = jobs.find((j) => j.id === a.job_id);
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    try {
      await supabase.from("notifications").insert({
        user_id: a.user_id,
        type: "application",
        title: `Application ${label}`,
        body: `Your application for ${job?.title ?? "the role"} is now ${label}.`,
        link: "/app/applied",
      });
    } catch { /* RLS may block; non-blocking */ }
    toast.success(`Marked ${label}`);
  };

  const viewResume = async (a: App) => {
    const r = a.resume_id ? resumes[a.resume_id] : null;
    if (!r?.file_path) { toast.error("Resume file not available"); return; }
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(r.file_path, 60 * 10);
    if (error || !data?.signedUrl) { toast.error(error?.message || "Couldn't open resume"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7 text-secondary" /> Applicants</h1>
          <p className="text-muted-foreground mt-2">Ranked by AI match score. Real-time updates as candidates apply.</p>
        </div>
        <Select value={filterJob} onValueChange={setFilterJob}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="mt-10 p-10 text-center border-dashed">
          <Users className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No applicants yet for this filter.</p>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {filtered.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)).map((a) => {
            const job = jobs.find((j) => j.id === a.job_id);
            const resume = a.resume_id ? resumes[a.resume_id] : null;
            const skills = (a.skills && a.skills.length ? a.skills : resume?.skills) ?? [];
            const name = a.full_name || `Candidate ${a.user_id.slice(0, 6)}`;
            return (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>Applied for <span className="font-medium text-foreground">{job?.title ?? "—"}</span></span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(a.created_at).toLocaleDateString()}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                        {a.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span>}
                        {a.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{a.phone}</span>}
                        {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground underline-offset-2 hover:underline"><Link2 className="h-3 w-3" />Portfolio</a>}
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {skills.slice(0, 10).map((s) => (
                            <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>
                          ))}
                        </div>
                      )}
                      <Badge className={`mt-2 capitalize ${STATUS_COLOR[a.status] ?? "bg-muted"}`}>{(STATUS_OPTIONS.find((s) => s.value === a.status)?.label ?? a.status).toString()}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</p>
                        <p className={`font-display font-bold ${scoreTone(a.match_score)}`}>{a.match_score ?? "—"}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ATS</p>
                        <p className="font-display font-bold">{resume?.ats_score ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setViewing(a)}>Details</Button>
                      <Button size="sm" variant="outline" onClick={() => viewResume(a)} disabled={!resume?.file_path}>
                        <FileText className="h-3.5 w-3.5" /> Resume
                      </Button>
                      <Select value={a.status} onValueChange={(v) => setStatus(a, v)}>
                        <SelectTrigger className="h-8 w-44 capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant={a.status === "shortlisted" ? "hero" : "outline"} onClick={() => setStatus(a, "shortlisted")}>
                        <Star className="h-3.5 w-3.5" /> Shortlist
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.full_name ?? "Applicant"}</DialogTitle>
            <DialogDescription>
              Applied for {jobs.find((j) => j.id === viewing?.job_id)?.title} · {viewing && new Date(viewing.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Email</p><p>{viewing.email ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p>{viewing.phone ?? "—"}</p></div>
              </div>
              {viewing.portfolio_url && (
                <div><p className="text-xs text-muted-foreground">Portfolio / LinkedIn</p><a href={viewing.portfolio_url} target="_blank" rel="noreferrer" className="text-secondary hover:underline break-all">{viewing.portfolio_url}</a></div>
              )}
              <div><p className="text-xs text-muted-foreground">Skills</p>
                <div className="flex flex-wrap gap-1.5 mt-1">{(viewing.skills ?? []).map((s) => <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>)}</div>
              </div>
              <div><p className="text-xs text-muted-foreground">Experience</p><p className="whitespace-pre-wrap">{viewing.experience ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Education</p><p className="whitespace-pre-wrap">{viewing.education ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Cover Letter</p><p className="whitespace-pre-wrap">{viewing.cover_letter ?? "—"}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Applicants;
