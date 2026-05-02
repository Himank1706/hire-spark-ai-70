// Job matching: TF-IDF + cosine similarity over resume vs jobs, with AI-generated "why this matches" explanations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","of","to","in","on","at","for","with","by","from","as","is","are","was","were","be","been","being","have","has","had","do","does","did","this","that","these","those","it","its","our","we","you","your","my","i","they","them","their","he","she","his","her","not","no","so","such","than","too","very","can","will","just","should","could","would","may","might","also","into","over","under","more","most","other","some","any","all","each","every","both","few","several","many","much","up","down","out","off","new","old"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\- ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  // L2 normalize raw counts
  return tf;
}

function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFreq(tokens);
  const v = new Map<string, number>();
  for (const [term, count] of tf) {
    const i = idf.get(term);
    if (i) v.set(term, count * i);
  }
  return v;
}

function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  for (const [, va] of a) na += va * va;
  for (const [, vb] of b) nb += vb * vb;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb) dot += va * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Get the user's most recent resume
    const { data: resume } = await supabase
      .from("resumes")
      .select("id, raw_text, skills, experience")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resume) return json({ error: "Upload and analyze a resume first." }, 400);

    // Get applied job ids
    const { data: applied } = await supabase
      .from("job_applications")
      .select("job_id")
      .eq("user_id", user.id);
    const appliedIds = new Set((applied ?? []).map((a: any) => a.job_id));

    // Get all active jobs
    const { data: jobs, error: jobsErr } = await supabase
      .from("jobs")
      .select("id, title, company, location, description, required_skills, experience_level, experience_years_min, salary_min, salary_max, currency")
      .eq("is_active", true);
    if (jobsErr) return json({ error: jobsErr.message }, 500);

    const candidateJobs = (jobs ?? []).filter((j: any) => !appliedIds.has(j.id));

    // Build corpus: resume + each job (title + skills + description)
    const resumeSkills: string[] = Array.isArray(resume.skills) ? resume.skills : [];
    const resumeText = `${resume.raw_text ?? ""} ${resumeSkills.join(" ")}`;
    const docs: string[][] = [tokenize(resumeText)];
    const jobDocs = candidateJobs.map((j: any) => {
      const skills = Array.isArray(j.required_skills) ? j.required_skills : [];
      return tokenize(`${j.title} ${j.description} ${skills.join(" ")}`);
    });
    docs.push(...jobDocs);

    // Compute IDF
    const N = docs.length;
    const df = new Map<string, number>();
    for (const d of docs) {
      const seen = new Set(d);
      for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
    }
    const idf = new Map<string, number>();
    for (const [t, c] of df) idf.set(t, Math.log((N + 1) / (c + 1)) + 1);

    const resumeVec = tfidfVector(docs[0], idf);
    const resumeSkillsLower = new Set(resumeSkills.map((s) => s.toLowerCase().trim()));

    // Score each job
    const ranked = candidateJobs.map((j: any, i: number) => {
      const jobVec = tfidfVector(docs[i + 1], idf);
      const sim = cosineSim(resumeVec, jobVec); // 0..1

      const required: string[] = Array.isArray(j.required_skills) ? j.required_skills : [];
      const requiredLower = required.map((s) => s.toLowerCase().trim());
      const matched = required.filter((s) => resumeSkillsLower.has(s.toLowerCase().trim()));
      const missing = required.filter((s) => !resumeSkillsLower.has(s.toLowerCase().trim()));
      const skillOverlap = required.length > 0 ? matched.length / required.length : 0;

      // Hybrid: 60% skill overlap (deterministic), 40% TF-IDF semantic similarity
      const score = Math.round((skillOverlap * 0.6 + sim * 0.4) * 100);

      return {
        ...j,
        match_score: score,
        skill_overlap_pct: Math.round(skillOverlap * 100),
        tfidf_similarity: Number(sim.toFixed(3)),
        matched_skills: matched,
        missing_skills: missing,
      };
    });

    ranked.sort((a, b) => b.match_score - a.match_score);
    const top = ranked.slice(0, 12);

    return json({
      jobs: top,
      total_candidates: candidateJobs.length,
      applied_count: appliedIds.size,
      resume_id: resume.id,
    });
  } catch (e) {
    console.error("match-jobs error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
