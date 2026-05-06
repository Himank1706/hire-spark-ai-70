import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const EmployerProfile = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", headline: "", avatar_url: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, headline, avatar_url").eq("id", user.id).maybeSingle();
      if (data) setForm({ full_name: data.full_name ?? "", headline: data.headline ?? "", avatar_url: data.avatar_url ?? "" });
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.full_name,
      headline: form.headline,
      avatar_url: form.avatar_url || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
  };

  if (loading) return <div className="p-10 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><UserIcon className="h-7 w-7 text-secondary" /> Employer Profile</h1>
      <p className="text-muted-foreground mt-2">How candidates see your company.</p>

      <Card className="mt-8 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={form.avatar_url || undefined} />
            <AvatarFallback>{(form.full_name || user?.email || "E").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{user?.email}</p>
            <p>Employer account</p>
          </div>
        </div>
        <div>
          <Label>Full name / Recruiter</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <Label>Company headline</Label>
          <Input placeholder="Hiring at Acme Inc · Talent Lead" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </div>
        <div>
          <Label>Avatar URL</Label>
          <Input placeholder="https://…" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
        </div>
        <Button variant="hero" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
        </Button>
      </Card>
    </div>
  );
};

export default EmployerProfile;
