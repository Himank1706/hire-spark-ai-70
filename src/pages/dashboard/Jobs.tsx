import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, MapPin, DollarSign, CheckCircle2, AlertTriangle, RefreshCw, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  required_skills: string[];
  experience_level: string | null;
  experience_years_min: number | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  match_score: number;
  skill_overlap_pct: number;
  tfidf_similarity: number;
  matched_skills: string[];
  missing_skills: string[];
};

const Jobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [needsResume, setNeedsResume] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("match-jobs", { body: {} });
    if (error || data?.error) {
      const msg = data?.error || error?.message || "Failed to load jobs";
      if (msg.toLowerCase().includes("upload")) setNeedsResume(true);
      else toast.error(msg);
      setLoading(false);
      return;
    }
    setJobs(data.jobs ?? []);
    setResumeId(data.resume_id ?? null);
    setNeedsResume(false);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const apply = async (job: Job) => {
    if (!user) return;
    setApplying(job.id);
    const { error } = await supabase.from("job_applications").insert({
      user_id: user.id,
      job_id: job.id,
      resume_id: resumeId,
      match_score: job.match_score,
    });
    setApplying(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Applied to ${job.title}`);
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Ranking jobs against your resume…
      </div>
    );
  }

  if (needsResume) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <Card className="p-10 text-center border-dashed">
          <Target className="h-10 w-10 text-secondary mx-auto" />
          <h2 className="font-display text-2xl font-bold mt-4">Analyze a resume first</h2>
          <p className="text-muted-foreground mt-2">We rank jobs by matching your skills against requirements. Upload a resume to get started.</p>
          <Button asChild variant="hero" className="mt-6"><Link to="/app/resume">Analyze My Resume</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Recommended Jobs</h1>
          <p className="text-muted-foreground mt-2">Ranked using TF-IDF similarity + skill overlap against your latest resume.</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="mt-8 p-10 text-center border-dashed">
          <p className="text-muted-foreground">No more jobs to recommend. You've applied to all matching ones — great hustle!</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/app/applied">View applied jobs</Link></Button>
        </Card>
      ) : (
        <div className="mt-8 grid gap-5">
          {jobs.map((j) => (
            <Card key={j.id} className="p-6 hover:shadow-elegant transition-smooth">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-accent text-secondary">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg leading-tight">{j.title}</h3>
                      <p className="text-sm text-muted-foreground">{j.company}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                    {j.experience_level && <span>· {j.experience_level} ({j.experience_years_min}+ yrs)</span>}
                    {j.salary_min && j.salary_max && (
                      <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{j.salary_min.toLocaleString()}–{j.salary_max.toLocaleString()} {j.currency}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{j.description}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-success uppercase tracking-wider mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> You have ({j.matched_skills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {j.matched_skills.length === 0 ? <span className="text-xs text-muted-foreground">—</span> :
                          j.matched_skills.map((s) => <Badge key={s} className="bg-success/15 text-success hover:bg-success/15 border-0">{s}</Badge>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Gaps ({j.missing_skills.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {j.missing_skills.length === 0 ? <span className="text-xs text-muted-foreground">None 🎉</span> :
                          j.missing_skills.map((s) => <Badge key={s} variant="outline" className="border-destructive/40 text-destructive">{s}</Badge>)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[120px]">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Match</p>
                    <p className={`font-display text-4xl font-extrabold ${j.match_score >= 70 ? "text-success" : j.match_score >= 40 ? "text-secondary" : "text-muted-foreground"}`}>
                      {j.match_score}<span className="text-base text-muted-foreground">%</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{j.skill_overlap_pct}% skills · {(j.tfidf_similarity * 100).toFixed(0)}% sem.</p>
                  </div>
                  <Button variant="hero" onClick={() => apply(j)} disabled={applying === j.id}>
                    {applying === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Apply
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;
