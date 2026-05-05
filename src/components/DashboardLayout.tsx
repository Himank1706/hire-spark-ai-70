import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

export const DashboardLayout = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6">
          <NotificationBell />
        </header>
        <Outlet />
      </main>
    </div>
  );
};
