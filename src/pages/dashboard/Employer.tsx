import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Plus, Trash2, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  required_skills: string[];
  experience_level: string | null;
  experience_years_min: number | null;
  salary_min: number | null;
  salary_max: number | null;
  is_active: boolean;
  created_at: string;
};

type Applicant = {
  id: string;
  match_score: number | null;
  status: string;
  created_at: string;
  user_id: string;
  job_id: string;
};

const jobSchema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().min(20).max(5000),
  skills: z.string().trim().min(1).max(500),
  experience_level: z.string().trim().max(40).optional(),
  experience_years_min: z.coerce.number().int().min(0).max(50),
  salary_min: z.coerce.number().int().min(0).optional(),
  salary_max: z.coerce.number().int().min(0).optional(),
});

const Employer = () => {
  const { user } = useAuth();
  const [isEmployer, setIsEmployer] = useState(false);
  const [checking, setChecking] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Record<string, Applicant[]>>({});
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({
    title: "", company: "", location: "", description: "",
    skills: "", experience_level: "Mid", experience_years_min: "2",
    salary_min: "", salary_max: "",
  });

  const checkRole = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    setIsEmployer(!!data?.find((r: any) => r.role === "employer"));
    setChecking(false);
  };

  const becomeEmployer = async () => {
    if (!user) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "employer" });
    if (error) { toast.error(error.message); return; }
    toast.success("You're now an employer");
    setIsEmployer(true);
  };

  const loadJobs = async () => {
    if (!user) return;
    const { data } = await supabase.from("jobs")
      .select("id, title, company, location, required_skills, experience_level, experience_years_min, salary_min, salary_max, is_active, created_at")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Job[];
    setJobs(list);

    if (list.length > 0) {
      const ids = list.map((j) => j.id);
      const { data: apps } = await supabase.from("job_applications")
        .select("id, match_score, status, created_at, user_id, job_id")
        .in("job_id", ids);
      const grouped: Record<string, Applicant[]> = {};
      (apps ?? []).forEach((a: any) => {
        grouped[a.job_id] = grouped[a.job_id] || [];
        grouped[a.job_id].push(a);
      });
      setApplicants(grouped);
    }
  };

  useEffect(() => { checkRole(); }, [user]);
  useEffect(() => { if (isEmployer) loadJobs(); }, [isEmployer]);

  const post = async () => {
    if (!user) return;
    const parsed = jobSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setPosting(true);
    const skills = parsed.data.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("jobs").insert({
      employer_id: user.id,
      title: parsed.data.title,
      company: parsed.data.company,
      location: parsed.data.location || null,
      description: parsed.data.description,
      required_skills: skills,
      experience_level: parsed.data.experience_level || null,
      experience_years_min: parsed.data.experience_years_min,
      salary_min: parsed.data.salary_min || null,
      salary_max: parsed.data.salary_max || null,
      source: "employer",
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job posted");
    setForm({ title: "", company: "", location: "", description: "", skills: "", experience_level: "Mid", experience_years_min: "2", salary_min: "", salary_max: "" });
    loadJobs();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setJobs((p) => p.filter((j) => j.id !== id));
    toast.success("Job deleted");
  };

  if (checking) return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;

  if (!isEmployer) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <Card className="p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow mx-auto">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold mt-4">Employer Portal</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">Post jobs, view ranked applicants, and hire faster. Activate your employer account to get started — it's free.</p>
          <Button variant="hero" className="mt-6" onClick={becomeEmployer}>Activate Employer Account</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Employer Portal</h1>
      <p className="text-muted-foreground mt-2">Post jobs and review applicants ranked by AI match score.</p>

      <Card className="mt-8 p-6">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Post a new job</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Company *" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input placeholder="Experience level (e.g. Junior, Mid, Senior)" value={form.experience_level} onChange={(e) => setForm({ ...form, experience_level: e.target.value })} />
          <Input type="number" placeholder="Min years experience" value={form.experience_years_min} onChange={(e) => setForm({ ...form, experience_years_min: e.target.value })} />
          <Input placeholder="Required skills (comma-separated) *" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          <Input type="number" placeholder="Salary min" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} />
          <Input type="number" placeholder="Salary max" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} />
          <Textarea className="md:col-span-2" rows={4} placeholder="Job description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <Button variant="hero" className="mt-4" onClick={post} disabled={posting}>
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Post Job
        </Button>
      </Card>

      <h2 className="font-display text-xl font-bold mt-10 mb-4">Your jobs ({jobs.length})</h2>
      {jobs.length === 0 ? (
        <Card className="p-8 text-center border-dashed text-muted-foreground">No jobs posted yet.</Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => {
            const apps = applicants[j.id] ?? [];
            return (
              <Card key={j.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-accent text-secondary"><Briefcase className="h-5 w-5" /></div>
                    <div>
                      <p className="font-semibold">{j.title}</p>
                      <p className="text-sm text-muted-foreground">{j.company} {j.location && `· ${j.location}`} · {j.experience_level}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(j.required_skills ?? []).slice(0, 8).map((s) => <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-secondary/10 text-secondary border-0"><Users className="h-3 w-3 mr-1" /> {apps.length} applicants</Badge>
                    <Button variant="ghost" size="sm" onClick={() => remove(j.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {apps.length > 0 && (
                  <div className="mt-4 border-t pt-3 space-y-2">
                    {apps.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-mono text-xs">Candidate {a.user_id.slice(0, 8)}…</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">{a.status}</Badge>
                          {a.match_score != null && <span className="font-semibold text-secondary">{a.match_score}%</span>}
                          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Employer;
