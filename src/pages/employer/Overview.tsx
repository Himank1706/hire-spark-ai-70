import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, CheckCircle2, Sparkles, PlusCircle, Loader2, TrendingUp } from "lucide-react";

type Stats = {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  shortlisted: number;
};

const Overview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalJobs: 0, activeJobs: 0, totalApplicants: 0, shortlisted: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, company, is_active, created_at")
      .eq("employer_id", user.id);
    const jobIds = (jobs ?? []).map((j) => j.id);
    let apps: any[] = [];
    if (jobIds.length) {
      const { data } = await supabase
        .from("job_applications")
        .select("id, status, created_at, job_id, match_score")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      apps = data ?? [];
    }
    setStats({
      totalJobs: jobs?.length ?? 0,
      activeJobs: (jobs ?? []).filter((j) => j.is_active).length,
      totalApplicants: apps.length,
      shortlisted: apps.filter((a) => a.status === "shortlisted").length,
    });
    setRecent(apps.slice(0, 6));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("emp-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_applications" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const cards = [
    { label: "Total jobs posted", value: stats.totalJobs, icon: Briefcase, accent: "text-primary" },
    { label: "Active openings", value: stats.activeJobs, icon: Sparkles, accent: "text-secondary" },
    { label: "Total applicants", value: stats.totalApplicants, icon: Users, accent: "text-primary" },
    { label: "Shortlisted", value: stats.shortlisted, icon: CheckCircle2, accent: "text-success" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Employer Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track your hiring pipeline in real time.</p>
        </div>
        <Button asChild variant="hero"><Link to="/employer/post"><PlusCircle className="h-4 w-4" /> Post a Job</Link></Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className={`h-5 w-5 ${c.accent}`} />
            </div>
            <p className="font-display text-3xl font-extrabold mt-2">{loading ? "—" : c.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-secondary" /> Recent applicants</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/employer/applicants">View all</Link></Button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applicants yet. Once candidates apply, they'll show here in real time.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((a) => (
              <li key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-muted-foreground">App {a.id.slice(0, 8)}…</span>
                <span className="capitalize">{a.status}</span>
                <span className="text-secondary font-semibold">{a.match_score ?? "—"}%</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Overview;
