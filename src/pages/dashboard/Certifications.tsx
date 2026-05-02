import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Award, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type Cert = {
  id: string;
  name: string;
  issuing_org: string | null;
  source: string;
  created_at: string;
};

const certSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  issuing_org: z.string().trim().max(200).optional(),
});

const Certifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("certifications")
      .select("id, name, issuing_org, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Cert[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user) return;
    const parsed = certSchema.safeParse({ name, issuing_org: org });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setAdding(true);
    const { data, error } = await supabase.from("certifications").insert({
      user_id: user.id,
      name: parsed.data.name,
      issuing_org: parsed.data.issuing_org || null,
      source: "manual",
    }).select().single();
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => [data as Cert, ...prev]);
    setName(""); setOrg("");
    toast.success("Certification added");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("certifications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((c) => c.id !== id));
    toast.success("Removed");
  };

  if (loading) return <div className="p-10 flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Certifications</h1>
      <p className="text-muted-foreground mt-2">Auto-extracted from your resume — and you can add more anytime.</p>

      <Card className="mt-8 p-6">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Add a certification</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Certification name (e.g. AWS Solutions Architect)" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          <Input placeholder="Issuing org (optional)" value={org} onChange={(e) => setOrg(e.target.value)} maxLength={200} />
          <Button variant="hero" onClick={add} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="mt-6 p-10 text-center border-dashed">
          <Award className="h-10 w-10 text-secondary mx-auto" />
          <p className="text-muted-foreground mt-3">No certifications yet. Add one above or analyze a resume — we'll extract them automatically.</p>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id} className="p-5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-glow shrink-0">
                  <Award className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  {c.issuing_org && <p className="text-sm text-muted-foreground">{c.issuing_org}</p>}
                  <Badge variant="secondary" className="mt-2 bg-accent text-accent-foreground text-[10px]">
                    {c.source === "resume" ? <><Sparkles className="h-3 w-3 mr-1" /> from resume</> : "manual"}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certifications;
