import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "employer" | "job_seeker" | "admin";
export type SignupRole = "employer" | "job_seeker";

export const resolveAppRole = (roles: AppRole[]): AppRole => {
  if (roles.includes("employer")) return "employer";
  if (roles.includes("admin")) return "admin";
  return "job_seeker";
};

export const dashboardForRole = (role: AppRole | null) => (role === "employer" ? "/employer/dashboard" : "/app/dashboard");

export const resolveRoleForUser = async (authUser: User, requestedRole?: SignupRole): Promise<AppRole> => {
  const metadataIntent = authUser.user_metadata?.intent === "employer" ? "employer" : "job_seeker";
  let { data } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id);
  let roles = (data ?? []).map((r: any) => r.role as AppRole);

  const roleToPersist = requestedRole ?? (metadataIntent === "employer" && !roles.includes("employer") ? "employer" : roles.length === 0 ? metadataIntent : undefined);
  if (roleToPersist && !roles.includes(roleToPersist)) {
    const { data: resolved } = await (supabase as any).rpc("complete_role_onboarding", {
      _role: roleToPersist,
      _full_name: authUser.user_metadata?.full_name ?? null,
    });
    if (resolved) return resolved as AppRole;

    const refreshed = await supabase.from("user_roles").select("role").eq("user_id", authUser.id);
    roles = (refreshed.data ?? []).map((r: any) => r.role as AppRole);
  }

  return roles.length > 0 ? resolveAppRole(roles) : metadataIntent;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  roleLoading: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true, role: null, roleLoading: true,
  refreshRole: async () => {}, signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchRole = async (authUser: User | null | undefined) => {
    if (!authUser) { setRole(null); setRoleLoading(false); return; }
    setRoleLoading(true);
    const nextRole = await resolveRoleForUser(authUser);
    setRole(nextRole);
    setRoleLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Defer role fetch to avoid deadlocks inside the auth callback
      if (s?.user) {
        setTimeout(() => { fetchRole(s.user); }, 0);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) fetchRole(s.user);
      else setRoleLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshRole = async () => { if (user) await fetchRole(user); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ user, session, loading, role, roleLoading, refreshRole, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
