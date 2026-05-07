import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Building2, LogOut, LayoutDashboard, PlusCircle, Briefcase, Users, BarChart3, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";
import { RequireRole } from "./RequireRole";
import { toast } from "sonner";

const items = [
  { to: "/employer/dashboard", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/employer/post", icon: PlusCircle, label: "Post Job" },
  { to: "/employer/jobs", icon: Briefcase, label: "Manage Jobs" },
  { to: "/employer/applicants", icon: Users, label: "Applicants" },
  { to: "/employer/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/employer/profile", icon: UserIcon, label: "Profile" },
];

export const EmployerLayout = () => {
  const { signOut, user } = useAuth();
  const nav = useNavigate();

  return (
    <RequireRole allow={["employer", "admin"]}>
      <div className="flex min-h-screen bg-muted/20">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
          <div className="p-6 border-b border-sidebar-border">
            <NavLink to="/employer/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-bold leading-tight">HireSense</p>
                <p className="text-xs text-muted-foreground">Employer Portal</p>
              </div>
            </NavLink>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {items.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth ${
                    isActive
                      ? "gradient-secondary text-secondary-foreground shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={async () => { await signOut(); toast.success("Signed out"); nav("/"); }}
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6">
            <p className="text-sm text-muted-foreground hidden md:block">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <NotificationBell />
            </div>
          </header>
          <Outlet />
        </main>
      </div>
    </RequireRole>
  );
};
