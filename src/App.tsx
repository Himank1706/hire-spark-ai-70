import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/dashboard/Dashboard";
import ResumeAnalysis from "./pages/dashboard/ResumeAnalysis";
import Jobs from "./pages/dashboard/Jobs";
import AppliedJobs from "./pages/dashboard/AppliedJobs";
import Certifications from "./pages/dashboard/Certifications";
import Employer from "./pages/dashboard/Employer";
import Profile from "./pages/dashboard/Profile";
import { ComingSoon } from "./pages/dashboard/ComingSoon";
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
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="resume" element={<ResumeAnalysis />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="learning" element={<ComingSoon title="Learning Plan" desc="Weekly roadmap to close skill gaps." />} />
              <Route path="applied" element={<AppliedJobs />} />
              <Route path="certifications" element={<Certifications />} />
              <Route path="employer" element={<Employer />} />
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
