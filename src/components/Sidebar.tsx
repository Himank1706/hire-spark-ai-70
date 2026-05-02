import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Briefcase, Award, User, LogOut, Brain, BookOpen, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const items = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/resume", icon: FileText, label: "Resume Analysis" },
  { to: "/app/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/app/learning", icon: BookOpen, label: "Learning Plan" },
  { to: "/app/applied", icon: Award, label: "Applied Jobs" },
  { to: "/app/certifications", icon: Award, label: "Certifications" },
  { to: "/app/employer", icon: Building2, label: "For Employers" },
  { to: "/app/profile", icon: User, label: "Profile" },
];

export const Sidebar = () => {
  const { signOut } = useAuth();
  const nav = useNavigate();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display font-bold leading-tight">HireSense</p>
            <p className="text-xs text-muted-foreground">AI Career OS</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth ${
                isActive
                  ? "gradient-secondary text-secondary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
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
  );
};
