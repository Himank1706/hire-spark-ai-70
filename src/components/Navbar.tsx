import { Link, useLocation } from "react-router-dom";
import { Brain, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const { user } = useAuth();
  const loc = useLocation();
  if (loc.pathname.startsWith("/app")) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">
            Hire<span className="text-secondary">Sense</span> <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="font-medium">AI Tools</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem asChild><Link to="/app/resume">Resume Checker</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/app/jobs">Find Jobs</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/app/resume">AI Score Check</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" asChild><a href="#features">Features</a></Button>
          <Button variant="ghost" asChild><a href="#how">How It Works</a></Button>
          <Button variant="ghost" asChild><a href="#results">Results</a></Button>
          <Button variant="ghost" asChild className="font-semibold text-secondary"><Link to="/app/employer">For Employers</Link></Button>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild variant="hero"><Link to="/app">Dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Login</Link></Button>
              <Button asChild variant="hero"><Link to="/signup">Get Started</Link></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden"><Menu /></Button>
        </div>
      </div>
    </header>
  );
};
