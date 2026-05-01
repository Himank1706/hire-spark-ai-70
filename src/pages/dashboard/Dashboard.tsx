import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Briefcase, BookOpen, TrendingUp, Sparkles } from "lucide-react";

type Resume = {
  id: string;
  file_name: string;
  ats_score: number | null;
  created_at: string;
  skills: string[] | null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("resumes")
        .select("id, file_name, ats_score, created_at, skills")
        .order("created_at", { ascending: false })
        .limit(5);
      setResumes((data ?? []) as Resume[]);
      setLoading(false);
    })();
  }, []);

  const latest = resumes[0];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{user?.email?.split("@")[0]} 👋</h1>
        <p className="text-muted-foreground mt-2">Here's your career intelligence at a glance.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3 mb-8">
        <StatCard icon={TrendingUp} label="Latest ATS Score" value={latest?.ats_score ? `${latest.ats_score}/100` : "—"} accent />
        <StatCard icon={FileText} label="Resumes Analyzed" value={String(resumes.length)} />
        <StatCard icon={Sparkles} label="Skills Detected" value={String(latest?.skills?.length ?? 0)} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <ActionCard to="/app/resume" icon={FileText} title="Analyze a Resume" desc="Upload PDF/DOCX and get an instant ATS score." />
        <ActionCard to="/app/jobs" icon={Briefcase} title="Find Matching Jobs" desc="Discover jobs ranked by skill fit." />
        <ActionCard to="/app/learning" icon={BookOpen} title="Build a Learning Plan" desc="Close skill gaps with a weekly roadmap." />
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold mb-4">Recent analyses</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : resumes.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <p className="text-muted-foreground">No resumes yet.</p>
            <Button asChild variant="hero" className="mt-4"><Link to="/app/resume">Analyze your first resume</Link></Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => (
              <Card key={r.id} className="p-4 flex items-center justify-between hover:shadow-elegant transition-smooth">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-accent text-secondary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{r.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ATS</p>
                    <p className="font-display font-bold text-secondary">{r.ats_score ?? "—"}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: any) => (
  <Card className={`p-6 ${accent ? "gradient-secondary text-secondary-foreground" : ""}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${accent ? "text-secondary-foreground/80" : "text-muted-foreground"}`}>{label}</p>
        <p className="font-display text-3xl font-extrabold mt-1">{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent ? "bg-primary/20" : "gradient-accent text-secondary"}`}>
        <Icon className={`h-6 w-6 ${accent ? "text-primary" : ""}`} />
      </div>
    </div>
  </Card>
);

const ActionCard = ({ to, icon: Icon, title, desc }: any) => (
  <Link to={to} className="block">
    <Card className="p-6 h-full hover:shadow-elegant hover:border-primary/40 transition-smooth group">
      <Icon className="h-7 w-7 text-secondary mb-3" />
      <h3 className="font-display font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <div className="mt-3 inline-flex items-center text-sm font-semibold text-secondary group-hover:gap-2 transition-smooth">
        Open <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </Card>
  </Link>
);

export default Dashboard;
