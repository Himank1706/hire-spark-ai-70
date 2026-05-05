import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Analysis = {
  id: string;
  file_name: string;
  ats_score: number;
  score_breakdown: { skills: number; experience: number; keywords: number; education: number; formatting: number };
  skills: string[];
  education: { degree: string; institution: string; year?: string }[];
  experience: { title: string; company: string; duration?: string; highlights?: string[] }[];
  suggestions: string[];
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  missing_keywords?: string[];
  formatting_issues?: string[];
};

const ResumeAnalysis = () => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("resume.txt");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      setText(await file.text());
      toast.success("File loaded");
      return;
    }
    // PDF/DOCX: upload to storage and extract via simple text fallback
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const ab = await file.arrayBuffer();
        const extracted = await extractPdfText(ab);
        if (extracted.trim().length > 50) {
          setText(extracted);
          toast.success("PDF text extracted");
        } else {
          toast.error("Couldn't extract text. Paste it manually below.");
        }
      } catch (e) {
        toast.error("PDF parsing failed. Paste text manually.");
      }
      return;
    }
    toast.message("DOCX not auto-parsed yet — please paste text below.");
  };

  const analyze = async () => {
    if (!user) return;
    if (text.trim().length < 50) { toast.error("Please paste or upload a resume with more content."); return; }
    setLoading(true);
    setResult(null);

    let filePath: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeText: text, fileName, filePath },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.resume as Analysis);
      toast.success("Analysis complete!");
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Resume Analysis</h1>
      <p className="text-muted-foreground mt-2">Upload or paste your resume. We score it against modern ATS rubrics in seconds.</p>

      {!result && (
        <Card className="mt-8 p-8">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-smooth"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary shadow-glow mb-4">
              <Upload className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="font-semibold">Drop your resume here</p>
            <p className="text-sm text-muted-foreground mt-1">PDF or .txt — or paste text below</p>
            <input ref={inputRef} type="file" accept=".pdf,.txt,.docx" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium">Or paste resume text</label>
            <Textarea
              className="mt-2 min-h-[200px] font-mono text-xs"
              placeholder="Paste your full resume text here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={50000}
            />
            <p className="text-xs text-muted-foreground mt-1">{text.length} characters</p>
          </div>

          <Button variant="hero" size="lg" className="mt-6 w-full md:w-auto h-12 px-8" onClick={analyze} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Run AI Analysis</>}
          </Button>
        </Card>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <Card className="p-8 gradient-secondary text-secondary-foreground">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-wider text-secondary-foreground/80">Your ATS Score</p>
                <p className="font-display text-6xl font-extrabold mt-1">{result.ats_score}<span className="text-2xl text-secondary-foreground/70">/100</span></p>
                <p className="mt-2 text-secondary-foreground/90 max-w-xl">{result.summary}</p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-glow">
                <TrendingUp className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-display font-bold text-lg mb-4">Score Breakdown</h3>
              {Object.entries(result.score_breakdown).map(([k, v]) => {
                const max = { skills: 40, experience: 20, keywords: 20, education: 10, formatting: 10 }[k] ?? 100;
                return (
                  <div key={k} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{k}</span>
                      <span className="text-muted-foreground">{v}/{max}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${(v/max)*100}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Skills Detected ({result.skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.skills.map((s, i) => (
                  <Badge key={i} variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent">{s}</Badge>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" /> AI Suggestions
            </h3>
            <ul className="space-y-3">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ul>
          </Card>

          {result.experience.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display font-bold text-lg mb-4">Experience</h3>
              <div className="space-y-4">
                {result.experience.map((e, i) => (
                  <div key={i} className="border-l-2 border-primary pl-4">
                    <p className="font-semibold">{e.title} <span className="text-muted-foreground font-normal">— {e.company}</span></p>
                    {e.duration && <p className="text-xs text-muted-foreground">{e.duration}</p>}
                    {e.highlights && e.highlights.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                        {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.education.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display font-bold text-lg mb-4">Education</h3>
              <div className="space-y-2">
                {result.education.map((e, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-secondary mt-1" />
                    <div>
                      <p className="font-medium">{e.degree}</p>
                      <p className="text-sm text-muted-foreground">{e.institution} {e.year && `· ${e.year}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button variant="heroOutline" onClick={() => { setResult(null); setText(""); }}>Analyze another resume</Button>
        </div>
      )}
    </div>
  );
};

// PDF text extraction using pdfjs-dist v3 legacy build (no top-level await — esbuild-friendly).
async function extractPdfText(ab: ArrayBuffer): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
  const pdf = await pdfjs.getDocument({ data: ab }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
  }
  return out;
}

export default ResumeAnalysis;
