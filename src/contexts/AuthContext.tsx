import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "employer" | "job_seeker" | "admin";

export const resolveAppRole = (roles: AppRole[]): AppRole => {
  if (roles.includes("employer")) return "employer";
  if (roles.includes("admin")) return "admin";
  return "job_seeker";
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

  const fetchRole = async (uid: string | undefined) => {
    if (!uid) { setRole(null); setRoleLoading(false); return; }
    setRoleLoading(true);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const roles = (data ?? []).map((r: any) => r.role as AppRole);
    setRole(resolveAppRole(roles));
    setRoleLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Defer role fetch to avoid deadlocks inside the auth callback
      if (s?.user) {
        setTimeout(() => { fetchRole(s.user.id); }, 0);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) fetchRole(s.user.id);
      else setRoleLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshRole = async () => { if (user) await fetchRole(user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ user, session, loading, role, roleLoading, refreshRole, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
