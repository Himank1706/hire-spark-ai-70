import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RequireRole } from "@/components/RequireRole";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EmployerSignup from "./pages/EmployerSignup";
import { EmployerLayout } from "./components/EmployerLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import ResumeAnalysis from "./pages/dashboard/ResumeAnalysis";
import Jobs from "./pages/dashboard/Jobs";
import AppliedJobs from "./pages/dashboard/AppliedJobs";
import Certifications from "./pages/dashboard/Certifications";
import Profile from "./pages/dashboard/Profile";
import LearningPlan from "./pages/dashboard/LearningPlan";
import EmployerOverview from "./pages/employer/Overview";
import EmployerPostJob from "./pages/employer/PostJob";
import EmployerManageJobs from "./pages/employer/ManageJobs";
import EmployerApplicants from "./pages/employer/Applicants";
import EmployerAnalytics from "./pages/employer/Analytics";
import EmployerProfile from "./pages/employer/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/employer/signup" element={<EmployerSignup />} />

            {/* Employer area — only employers/admins */}
            <Route path="/employer" element={<EmployerLayout />}>
              <Route index element={<EmployerOverview />} />
              <Route path="post" element={<EmployerPostJob />} />
              <Route path="jobs" element={<EmployerManageJobs />} />
              <Route path="applicants" element={<EmployerApplicants />} />
              <Route path="analytics" element={<EmployerAnalytics />} />
              <Route path="profile" element={<EmployerProfile />} />
            </Route>

            {/* Job-seeker app — only job_seeker/admin */}
            <Route
              path="/app"
              element={
                <RequireRole allow={["job_seeker", "admin"]}>
                  <DashboardLayout />
                </RequireRole>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="resume" element={<ResumeAnalysis />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="learning" element={<LearningPlan />} />
              <Route path="applied" element={<AppliedJobs />} />
              <Route path="certifications" element={<Certifications />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
