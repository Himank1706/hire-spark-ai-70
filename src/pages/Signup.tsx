import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { dashboardForRole, resolveRoleForUser, SignupRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowRight, Brain, Building2, UserRound } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  fullName: z.string().trim().min(2, "Name too short").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<SignupRole | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/dashboard`,
        data: { full_name: parsed.data.fullName, intent: "job_seeker" },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created! Welcome aboard.");
    const role = data.user ? await resolveRoleForUser(data.user, "job_seeker") : "job_seeker";
    nav(dashboardForRole(role), { replace: true });
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 shadow-elegant border-border/60">
        <Link to="/" className="flex items-center gap-2 mb-6 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">HireSense AI</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-center">Create your account</h1>
        <p className="text-center text-muted-foreground text-sm mt-1 mb-6">Choose your HireSense workspace</p>
        {!accountType ? (
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setAccountType("job_seeker")}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-smooth hover:border-primary/50 hover:shadow-md"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
                  <UserRound className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">Sign up as Job Seeker</span>
                  <span className="block text-xs text-muted-foreground">Resume Analysis, ATS Score, Learning Plan, Jobs, Certifications, Profile</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => nav("/employer/signup")}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-smooth hover:border-secondary/50 hover:shadow-md"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-secondary text-secondary-foreground">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">Sign up as Employer</span>
                  <span className="block text-xs text-muted-foreground">Overview, Post Job, Manage Jobs, Applicants, Analytics, Employer Profile</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fn">Full name</Label>
            <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={72} />
          </div>
          <Button type="submit" variant="hero" className="w-full h-11" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setAccountType(null)}>
            Change account type
          </Button>
        </form>
        )}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="font-semibold text-secondary hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};
export default Signup;
