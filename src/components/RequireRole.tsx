import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { AppRole, dashboardForRole, useAuth } from "@/contexts/AuthContext";

type Props = { allow: AppRole[]; children: ReactNode; redirectTo?: string };

/** Route guard. Sends authenticated users to the right home if their role mismatches. */
export const RequireRole = ({ allow, children, redirectTo }: Props) => {
  const { user, loading, role, roleLoading } = useAuth();
  const loc = useLocation();

  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    const isEmployerArea = loc.pathname.startsWith("/employer");
    return <Navigate to={isEmployerArea ? "/employer/signup" : "/login"} replace />;
  }
  if (role && !allow.includes(role)) {
    // Push them to their natural home
    const home = redirectTo ?? dashboardForRole(role);
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
};
