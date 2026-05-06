import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, Loader2, Trash2, Pencil, Users, MapPin } from "lucide-react";
import { toast } from "sonner";

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
  description: string;
  is_active: boolean;
  created_at: string;
};

const ManageJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("jobs")
      .select("id, title, company, location, required_skills, experience_level, experience_years_min, salary_min, salary_max, description, is_active, created_at")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Job[];
    setJobs(list);
    if (list.length) {
      const { data: apps } = await supabase
        .from("job_applications")
        .select("job_id")
        .in("job_id", list.map((j) => j.id));
      const c: Record<string, number> = {};
      (apps ?? []).forEach((a: any) => { c[a.job_id] = (c[a.job_id] ?? 0) + 1; });
      setCounts(c);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggleActive = async (j: Job) => {
    const { error } = await supabase.from("jobs").update({ is_active: !j.is_active }).eq("id", j.id);
    if (error) { toast.error(error.message); return; }
    setJobs((p) => p.map((x) => x.id === j.id ? { ...x, is_active: !j.is_active } : x));
    toast.success(j.is_active ? "Job closed" : "Job reopened");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this job? Applicants will be removed too.")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setJobs((p) => p.filter((j) => j.id !== id));
    toast.success("Job deleted");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("jobs").update({
      title: editing.title,
      company: editing.company,
      location: editing.location,
      description: editing.description,
      required_skills: editing.required_skills,
      experience_level: editing.experience_level,
      experience_years_min: editing.experience_years_min,
      salary_min: editing.salary_min,
      salary_max: editing.salary_max,
    }).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job updated");
    setEditing(null);
    load();
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold">Manage Jobs</h1>
      <p className="text-muted-foreground mt-2">Edit, close, or delete your postings.</p>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : jobs.length === 0 ? (
        <Card className="mt-10 p-10 text-center border-dashed">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No jobs yet.</p>
          <Button asChild variant="hero" className="mt-4"><Link to="/employer/post">Post your first job</Link></Button>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {jobs.map((j) => (
            <Card key={j.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-accent text-secondary"><Briefcase className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{j.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {j.company}
                      {j.location && <><span>·</span><MapPin className="h-3 w-3" />{j.location}</>}
                      {j.experience_level && <><span>·</span>{j.experience_level}</>}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(j.required_skills ?? []).slice(0, 8).map((s) => (
                        <Badge key={s} variant="secondary" className="bg-accent text-accent-foreground">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className="bg-secondary/10 text-secondary border-0"><Users className="h-3 w-3 mr-1" /> {counts[j.id] ?? 0}</Badge>
                  <div className="flex items-center gap-2">
                    <Switch checked={j.is_active} onCheckedChange={() => toggleActive(j)} />
                    <span className="text-xs text-muted-foreground">{j.is_active ? "Open" : "Closed"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(j)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(j.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit job</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 md:grid-cols-2">
              <Input className="md:col-span-2" placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Input placeholder="Company" value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
              <Input placeholder="Location" value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              <Input placeholder="Experience level" value={editing.experience_level ?? ""} onChange={(e) => setEditing({ ...editing, experience_level: e.target.value })} />
              <Input type="number" placeholder="Min years" value={editing.experience_years_min ?? 0} onChange={(e) => setEditing({ ...editing, experience_years_min: Number(e.target.value) })} />
              <Input type="number" placeholder="Salary min" value={editing.salary_min ?? ""} onChange={(e) => setEditing({ ...editing, salary_min: e.target.value ? Number(e.target.value) : null })} />
              <Input type="number" placeholder="Salary max" value={editing.salary_max ?? ""} onChange={(e) => setEditing({ ...editing, salary_max: e.target.value ? Number(e.target.value) : null })} />
              <Input className="md:col-span-2" placeholder="Skills (comma-separated)" value={(editing.required_skills ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, required_skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <Textarea className="md:col-span-2" rows={5} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="hero" onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageJobs;
