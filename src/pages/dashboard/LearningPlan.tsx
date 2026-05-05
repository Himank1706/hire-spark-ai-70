import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ExternalLink, Loader2, Sparkles, Target, GraduationCap, Wrench, FileText, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  target_role: string;
  summary: string | null;
  total_weeks: number;
  is_primary: boolean;
  created_at: string;
};
type Week = {
  id: string;
  plan_id: string;
  week_number: number;
  title: string;
  description: string | null;
  focus_skills: string[];
};
type Task = {
  id: string;
  plan_id: string;
  week_id: string;
  task_type: "lesson" | "resource" | "project";
  title: string;
  description: string | null;
  url: string | null;
  provider: string | null;
  estimated_hours: number | null;
  is_completed: boolean;
  sort_order: number;
};

const LearningPlan = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [weeksCount, setWeeksCount] = useState(4);

  const loadPlans = async () => {
    const { data } = await supabase
      .from("learning_plans")
      .select("*")
      .order("created_at", { ascending: false });
    setPlans((data ?? []) as Plan[]);
    const active = (data ?? []).find((p: any) => p.is_primary) ?? data?.[0] ?? null;
    setActivePlanId(active?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { if (user) loadPlans(); }, [user]);

  useEffect(() => {
    if (!activePlanId) { setWeeks([]); setTasks([]); return; }
    (async () => {
      const [{ data: w }, { data: t }] = await Promise.all([
        supabase.from("plan_weeks").select("*").eq("plan_id", activePlanId).order("week_number"),
        supabase.from("plan_tasks").select("*").eq("plan_id", activePlanId).order("sort_order"),
      ]);
      setWeeks((w ?? []) as Week[]);
      setTasks((t ?? []) as Task[]);
    })();
  }, [activePlanId]);

  useEffect(() => {
    if (!activePlanId) return;
    const ch = supabase
      .channel(`plan-${activePlanId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "plan_tasks", filter: `plan_id=eq.${activePlanId}` },
        (payload) => {
          setTasks((prev) => prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t)));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activePlanId]);

  const activePlan = useMemo(() => plans.find((p) => p.id === activePlanId) ?? null, [plans, activePlanId]);
  const total = tasks.length;
  const done = tasks.filter((t) => t.is_completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const generate = async () => {
    if (!targetRole.trim()) { toast.error("Enter a target role first"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: { targetRole: targetRole.trim(), weeks: weeksCount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Learning plan generated!");
      setTargetRole("");
      await loadPlans();
      setActivePlanId(data.plan_id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const next = !task.is_completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_completed: next } : t)));
    const { error } = await supabase
      .from("plan_tasks")
      .update({ is_completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", task.id);
    if (error) {
      toast.error("Couldn't update task");
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_completed: !next } : t)));
    }
  };

  const setPrimary = async (id: string) => {
    await supabase.from("learning_plans").update({ is_primary: false }).eq("user_id", user!.id);
    await supabase.from("learning_plans").update({ is_primary: true }).eq("id", id);
    await loadPlans();
    setActivePlanId(id);
    toast.success("Set as primary plan");
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this learning plan? This cannot be undone.")) return;
    const { error } = await supabase.from("learning_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plan deleted");
    await loadPlans();
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" /> Learning Plan
          </h1>
          <p className="text-muted-foreground mt-2">Personalized weekly roadmap to close your skill gap.</p>
        </div>
      </div>

      <Card className="mt-8 p-6 border-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display font-bold text-lg">Generate a new plan</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[2fr_auto_auto]">
          <Input
            placeholder="Target role (e.g. Senior Backend Engineer, ML Engineer)"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            disabled={generating}
          />
          <Input
            type="number"
            min={2}
            max={12}
            value={weeksCount}
            onChange={(e) => setWeeksCount(parseInt(e.target.value) || 4)}
            className="w-24"
            disabled={generating}
          />
          <Button variant="hero" onClick={generate} disabled={generating} className="h-10">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Uses skills from your latest analyzed resume. {plans.length === 0 && "Run a Resume Analysis first for best results."}
        </p>
      </Card>

      {loading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="mt-8 p-12 text-center border-dashed">
          <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No learning plans yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate your first roadmap above to start closing your skill gap.</p>
        </Card>
      ) : (
        <>
          {plans.length > 1 && (
            <div className="mt-8 flex gap-2 flex-wrap">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePlanId(p.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-smooth ${
                    activePlanId === p.id
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {p.target_role}
                  {p.is_primary && <span className="ml-1.5 text-xs">★</span>}
                </button>
              ))}
            </div>
          )}

          {activePlan && (
            <Card className="mt-6 p-6 gradient-secondary text-secondary-foreground">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-secondary-foreground/80">Target Role</p>
                  <h2 className="font-display text-2xl font-bold mt-1">{activePlan.target_role}</h2>
                  {activePlan.summary && <p className="text-secondary-foreground/90 mt-2 max-w-2xl">{activePlan.summary}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-secondary-foreground/80">Progress</p>
                  <p className="font-display text-4xl font-extrabold mt-1">{pct}%</p>
                  <p className="text-xs text-secondary-foreground/80">{done} / {total} tasks</p>
                </div>
              </div>
              <Progress value={pct} className="mt-4 h-2 bg-secondary-foreground/20" />
              <div className="flex gap-2 mt-4">
                {!activePlan.is_primary && (
                  <Button size="sm" variant="hero" onClick={() => setPrimary(activePlan.id)}>
                    <RefreshCw className="h-4 w-4" /> Set as primary
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-secondary-foreground hover:bg-secondary-foreground/10" onClick={() => deletePlan(activePlan.id)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </Card>
          )}

          <div className="mt-6 space-y-5">
            {weeks.map((w) => {
              const wTasks = tasks.filter((t) => t.week_id === w.id);
              const wDone = wTasks.filter((t) => t.is_completed).length;
              const wPct = wTasks.length === 0 ? 0 : Math.round((wDone / wTasks.length) * 100);
              return (
                <Card key={w.id} className="p-6 hover:shadow-elegant transition-smooth">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-primary text-primary-foreground hover:bg-primary">Week {w.week_number}</Badge>
                        {w.focus_skills?.map((s, i) => (
                          <Badge key={i} variant="outline">{s}</Badge>
                        ))}
                      </div>
                      <h3 className="font-display font-bold text-xl mt-2">{w.title}</h3>
                      {w.description && <p className="text-sm text-muted-foreground mt-1">{w.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{wDone}/{wTasks.length} done</p>
                      <div className="w-32 h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                        <div className="h-full gradient-primary transition-all" style={{ width: `${wPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {wTasks.map((t) => (
                      <li key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-smooth ${
                        t.is_completed ? "bg-muted/40 border-muted" : "bg-background border-border hover:border-primary/40"
                      }`}>
                        <Checkbox
                          checked={t.is_completed}
                          onCheckedChange={() => toggleTask(t)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TaskTypeBadge type={t.task_type} />
                            <p className={`font-medium ${t.is_completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                            {t.estimated_hours ? <span className="text-xs text-muted-foreground">· {t.estimated_hours}h</span> : null}
                          </div>
                          {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                          {t.url && (
                            <a href={t.url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-secondary hover:underline mt-2">
                              {t.provider || "Open resource"} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                    {wTasks.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks for this week.</p>}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const TaskTypeBadge = ({ type }: { type: Task["task_type"] }) => {
  const map = {
    lesson: { icon: GraduationCap, label: "Lesson", cls: "bg-secondary/10 text-secondary" },
    resource: { icon: FileText, label: "Resource", cls: "bg-primary/10 text-primary" },
    project: { icon: Wrench, label: "Project", cls: "bg-success/10 text-success" },
  } as const;
  const m = map[type] ?? map.lesson;
  const Icon = m.icon;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${m.cls}`}>
    <Icon className="h-3 w-3" /> {m.label}
  </span>;
};

export default LearningPlan;
