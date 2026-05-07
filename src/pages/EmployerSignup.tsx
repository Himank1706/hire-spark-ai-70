import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, resolveAppRole, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EmployerSignup = () => {
  const { user, refreshRole } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [form, setForm] = useState({ fullName: "", company: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  // If already signed in, route to the correct dashboard by persisted role.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const resolved = resolveAppRole((roles ?? []).map((r: any) => r.role as AppRole));
      nav(resolved === "employer" ? "/employer/dashboard" : "/app/dashboard", { replace: true });
    })();
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/employer/dashboard`,
            data: { full_name: form.fullName, company: form.company, intent: "employer" },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "employer" as any });
          await refreshRole();
        }
        toast.success("Employer account created");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        if (data.user) {
          await refreshRole();
        }
        toast.success("Welcome back");
      }
      nav("/employer/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">HireSense for Employers</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-center">
          {mode === "signup" ? "Create your employer account" : "Employer login"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Post jobs, review AI-ranked applicants, and shortlist candidates.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <Label>Full name</Label>
                <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <Label>Work email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "signup" ? "Create employer account" : "Login"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-4">
          {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
          <button className="text-primary font-medium" onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
            {mode === "signup" ? "Login" : "Sign up"}
          </button>
        </p>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Looking for a job? <Link to="/signup" className="text-primary">Job seeker signup</Link>
        </p>
      </Card>
    </div>
  );
};

export default EmployerSignup;
