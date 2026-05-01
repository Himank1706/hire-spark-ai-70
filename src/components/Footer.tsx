import { Brain, Github, Twitter, Linkedin } from "lucide-react";
import { useLocation } from "react-router-dom";

export const Footer = () => {
  const loc = useLocation();
  if (loc.pathname.startsWith("/app")) return null;
  return (
    <footer className="border-t border-border/60 bg-muted/30 mt-24">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">HireSense AI</span>
          </div>
          <p className="text-sm text-muted-foreground">AI-powered career intelligence for the next generation of talent.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Resume Checker</li><li>Job Matching</li><li>Learning Plans</li><li>AI Enhancement</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>About</li><li>Blog</li><li>Careers</li><li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Connect</h4>
          <div className="flex gap-3 text-muted-foreground">
            <Twitter className="h-5 w-5 hover:text-secondary cursor-pointer transition-smooth" />
            <Github className="h-5 w-5 hover:text-secondary cursor-pointer transition-smooth" />
            <Linkedin className="h-5 w-5 hover:text-secondary cursor-pointer transition-smooth" />
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HireSense AI. Built for ambitious careers.
      </div>
    </footer>
  );
};
