import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Star, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

type App = {
  id: string;
  status: string;
  match_score: number | null;
  created_at: string;
  user_id: string;
  job_id: string;
  resume_id: string | null;
};

type Job = { id: string; title: string; required_skills: string[] };
type Resume = { id: string; user_id: string; ats_score: number | null; skills: string[] };
type Profile = { id: string; full_name: string | null; headline: string | null; avatar_url: string | null };

const STATUS_OPTIONS = ["applied", "reviewing", "shortlisted", "rejected", "hired"];

const Applicants = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [resumes, setResumes] = useState<Record<string, Resume>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filterJob, setFilterJob] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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
      .select("id, status, match_score, created_at, user_id, job_id, resume_id")
      .in("job_id", jobIds)
      .order("created_at", { ascending: false });
    const appList = (appData ?? []) as App[];
    setApps(appList);

    const resumeIds = Array.from(new Set(appList.map((a) => a.resume_id).filter(Boolean))) as string[];
    if (resumeIds.length) {
      const { data: r } = await supabase.from("resumes").select("id, user_id, ats_score, skills").in("id", resumeIds);
      const map: Record<string, Resume> = {};
      (r ?? []).forEach((x: any) => { map[x.id] = x; });
      setResumes(map);
    }
    const userIds = Array.from(new Set(appList.map((a) => a.user_id)));
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, full_name, headline, avatar_url").in("id", userIds);
      const map: Record<string, Profile> = {};
      (p ?? []).forEach((x: any) => { map[x.id] = x; });
      setProfiles(map);
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
    toast.success(`Marked ${status}`);
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
            const profile = profiles[a.user_id];
            const skills = resume?.skills ?? [];
            return (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {(profile?.full_name ?? "Candidate").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{profile?.full_name ?? `Candidate ${a.user_id.slice(0, 6)}`}</p>
                      {profile?.headline && <p className="text-sm text-muted-foreground">{profile.headline}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">Applied to <span className="font-medium text-foreground">{job?.title ?? "—"}</span> · {new Date(a.created_at).toLocaleDateString()}</p>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {skills.slice(0, 8).map((s) => (
                            <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</p>
                        <p className="font-display font-bold text-secondary">{a.match_score ?? "—"}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ATS</p>
                        <p className="font-display font-bold">{resume?.ats_score ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Select value={a.status} onValueChange={(v) => setStatus(a, v)}>
                        <SelectTrigger className="h-8 w-36 capitalize"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
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
    </div>
  );
};

export default Applicants;
