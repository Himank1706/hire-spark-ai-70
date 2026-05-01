import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Brain, Briefcase, FileSearch, Sparkles, Target, TrendingUp, Zap, BookOpen, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Landing = () => {
  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden gradient-hero">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 py-20 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-secondary mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-powered career intelligence
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
                Land your dream job with{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-secondary">AI on your side</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-primary/60 -z-0 rounded" />
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                HireSense AI analyzes your resume, scores it like an ATS, finds matching jobs, and builds a personalized learning roadmap — all in seconds.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button asChild variant="hero" size="lg" className="text-base h-12 px-7">
                  <Link to="/signup">Analyze My Resume <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="heroOutline" size="lg" className="text-base h-12 px-7">
                  <a href="#how">How it works</a>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> No credit card</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Instant ATS score</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Personalized roadmap</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="container mx-auto px-4 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-secondary">Features</p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">Everything you need, in one place</h2>
            <p className="mt-4 text-muted-foreground">Four AI tools that work together to get you hired faster.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileSearch, title: "Resume Analysis", desc: "Deep NLP parses skills, experience, education and grades you on a 100-point ATS rubric." },
              { icon: Briefcase, title: "Job Matching", desc: "Vector similarity matches you to roles with realistic match % and missing-skill gaps." },
              { icon: BookOpen, title: "Learning Roadmap", desc: "Weekly plan to close skill gaps — prioritized by impact on your target roles." },
              { icon: Sparkles, title: "AI Enhancement", desc: "Rewrites bullet points and summaries with strong action verbs and quantified impact." },
            ].map((f, i) => (
              <Card key={i} className="p-6 border-border/60 hover:border-primary/40 hover:shadow-elegant transition-smooth group">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-accent text-secondary mb-4 group-hover:gradient-primary group-hover:text-primary-foreground transition-smooth">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="bg-muted/40 py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-sm font-semibold uppercase tracking-wider text-secondary">How it works</p>
              <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">Three steps to clarity</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { n: "01", icon: Zap, title: "Upload", desc: "Drop your resume (PDF, DOCX, TXT). We extract raw text securely." },
                { n: "02", icon: Brain, title: "Analyze", desc: "AI parses skills, scores ATS readiness and finds gaps in seconds." },
                { n: "03", icon: Target, title: "Act", desc: "Get matched jobs, a learning roadmap, and an enhanced resume." },
              ].map((s) => (
                <div key={s.n} className="relative bg-card rounded-2xl p-8 shadow-md border border-border/60">
                  <div className="absolute -top-4 left-6 rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-glow">
                    STEP {s.n}
                  </div>
                  <s.icon className="h-8 w-8 text-secondary mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <section id="results" className="container mx-auto px-4 py-20">
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-secondary">Results that matter</p>
              <h2 className="mt-2 font-display text-4xl md:text-5xl font-bold">Real scores. Real suggestions. Real progress.</h2>
              <p className="mt-4 text-muted-foreground text-lg">Every analysis is generated dynamically by an LLM trained on hiring patterns — no templates, no canned feedback.</p>
              <div className="mt-8 grid grid-cols-3 gap-6">
                <Stat n="84%" l="Avg ATS lift" />
                <Stat n="3.2×" l="More callbacks" />
                <Stat n="< 30s" l="Per analysis" />
              </div>
            </div>
            <Card className="p-6 shadow-elegant border-border/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Your ATS Score</p>
                  <p className="font-display text-5xl font-extrabold text-secondary">87<span className="text-2xl text-muted-foreground">/100</span></p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-glow">
                  <TrendingUp className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                {[["Skills", 36, 40], ["Experience", 17, 20], ["Keywords", 16, 20], ["Education", 9, 10], ["Formatting", 9, 10]].map(([k, v, m]) => (
                  <div key={k as string}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium">{k}</span><span className="text-muted-foreground">{v}/{m}</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full gradient-primary rounded-full" style={{ width: `${(Number(v)/Number(m))*100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-20">
          <div className="rounded-3xl gradient-secondary p-12 md:p-16 text-center shadow-elegant relative overflow-hidden">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-secondary-foreground relative">
              Ready to be the obvious hire?
            </h2>
            <p className="mt-4 text-lg text-secondary-foreground/80 relative">Free to start. No setup. Just upload and learn.</p>
            <Button asChild variant="hero" size="lg" className="mt-8 h-12 px-8 text-base relative">
              <Link to="/signup">Start Free Analysis <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

const Stat = ({ n, l }: { n: string; l: string }) => (
  <div>
    <p className="font-display text-3xl font-extrabold text-secondary">{n}</p>
    <p className="text-sm text-muted-foreground mt-1">{l}</p>
  </div>
);

export default Landing;
