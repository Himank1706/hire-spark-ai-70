import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const Analytics = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: jd } = await supabase
      .from("jobs")
      .select("id, title, required_skills, created_at")
      .eq("employer_id", user.id);
    const j = jd ?? [];
    setJobs(j);
    if (j.length) {
      const { data: ad } = await supabase
        .from("job_applications")
        .select("id, job_id, created_at, status, match_score")
        .in("job_id", j.map((x: any) => x.id));
      setApps(ad ?? []);
    } else { setApps([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const perJob = useMemo(() => {
    return jobs.map((j) => ({
      name: j.title.length > 18 ? j.title.slice(0, 18) + "…" : j.title,
      applications: apps.filter((a) => a.job_id === j.id).length,
    }));
  }, [jobs, apps]);

  const skillCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => (j.required_skills ?? []).forEach((s: string) => {
      counts[s] = (counts[s] ?? 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count }));
  }, [jobs]);

  const trend = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    apps.forEach((a) => {
      const k = new Date(a.created_at).toISOString().slice(0, 10);
      if (k in days) days[k]++;
    });
    return Object.entries(days).map(([day, applications]) => ({ day: day.slice(5), applications }));
  }, [apps]);

  const insights = useMemo(() => {
    const avgMatch = apps.length
      ? Math.round(apps.reduce((s, a) => s + (a.match_score ?? 0), 0) / apps.length)
      : 0;
    const shortlistRate = apps.length
      ? Math.round((apps.filter((a) => a.status === "shortlisted").length / apps.length) * 100)
      : 0;
    return { avgMatch, shortlistRate };
  }, [apps]);

  if (loading) return <div className="p-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…</div>;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><BarChart3 className="h-7 w-7 text-secondary" /> Analytics</h1>
      <p className="text-muted-foreground mt-2">Hiring insights drawn live from your jobs and applicants.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Avg match score</p><p className="font-display text-3xl font-extrabold mt-2">{insights.avgMatch}%</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Shortlist rate</p><p className="font-display text-3xl font-extrabold mt-2">{insights.shortlistRate}%</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Total applications</p><p className="font-display text-3xl font-extrabold mt-2">{apps.length}</p></Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display font-semibold mb-4">Applications per job</h2>
        {perJob.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perJob}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="applications" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display font-semibold mb-4">Most-required skills</h2>
          {skillCounts.length === 0 ? <p className="text-sm text-muted-foreground">Add skills to jobs to see trends.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={skillCounts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="skill" type="category" width={90} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-display font-semibold mb-4">Applicant trend (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
