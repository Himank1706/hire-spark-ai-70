import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name, headline").eq("id", user.id).maybeSingle();
      setFullName(data?.full_name ?? "");
      setHeadline(data?.headline ?? "");
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim().slice(0, 100),
      headline: headline.trim().slice(0, 200),
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  };

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Profile</h1>
      <p className="text-muted-foreground mt-2">Tell us about yourself for tailored recommendations.</p>

      <Card className="mt-8 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-glow">
            <User className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Member</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <Label htmlFor="hl">Headline</Label>
            <Textarea id="hl" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200}
              placeholder="e.g., Aspiring full-stack developer | React, Node, Python" />
          </div>
          <Button variant="hero" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
