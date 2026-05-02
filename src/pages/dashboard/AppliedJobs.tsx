import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AppliedJob = {
  id: string;
  status: string;
  match_score: number | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string | null;
  } | null;
};

const AppliedJobs = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("job_applications")
      .select("id, status, match_score, created_at, jobs(id, title, company, location)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const withdraw = async (id: string) => {
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Application withdrawn");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Applied Jobs</h1>
      <p className="text-muted-foreground mt-2">Track every role you've applied to.</p>

      {items.length === 0 ? (
        <Card className="mt-8 p-10 text-center border-dashed">
          <p className="text-muted-foreground">You haven't applied to any jobs yet.</p>
          <Button asChild variant="hero" className="mt-4"><Link to="/app/jobs">Browse jobs</Link></Button>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-accent text-secondary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{a.jobs?.title ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.jobs?.company} {a.jobs?.location && `· ${a.jobs.location}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-accent text-accent-foreground capitalize">{a.status}</Badge>
                {a.match_score != null && <span className="text-sm font-semibold text-secondary">{a.match_score}% match</span>}
                <Button variant="ghost" size="sm" onClick={() => withdraw(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppliedJobs;
