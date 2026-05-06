import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { Building2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";
import { toast } from "sonner";

export const EmployerLayout = () => {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/employer/signup" replace />;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <NavLink to="/employer" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display font-bold leading-tight">HireSense</p>
              <p className="text-xs text-muted-foreground">Employer Portal</p>
            </div>
          </NavLink>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); toast.success("Signed out"); nav("/"); }}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main><Outlet /></main>
    </div>
  );
};
