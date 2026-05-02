// Resume analysis edge function — uses Lovable AI Gateway (Gemini) for real NLP extraction & ATS scoring.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) and senior technical recruiter.
You analyze raw resume text and return STRICT structured data via the provided tool.
Be realistic and critical. Extract only what's actually present. Score honestly using this rubric:
- skills (40): breadth, depth, relevance to modern industry demands
- experience (20): role progression, impact, quantified achievements
- keywords (20): industry-standard ATS keywords present
- education (10): degrees, institutions, certifications
- formatting (10): clarity, sections, length, action verbs
Total = sum (max 100). Provide 4-7 specific, actionable suggestions.`;

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

    const { resumeText, fileName, filePath } = await req.json();
    if (!resumeText || resumeText.trim().length < 50) {
      return json({ error: "Resume text is too short to analyze." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this resume:\n\n${resumeText.slice(0, 15000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_resume_analysis",
            description: "Return parsed resume data and ATS scoring.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence professional summary inferred from resume." },
                skills: { type: "array", items: { type: "string" }, description: "All technical and soft skills found." },
                education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      degree: { type: "string" },
                      institution: { type: "string" },
                      year: { type: "string" },
                    },
                    required: ["degree", "institution"],
                  },
                },
                experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      company: { type: "string" },
                      duration: { type: "string" },
                      highlights: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "company"],
                  },
                },
                score_breakdown: {
                  type: "object",
                  properties: {
                    skills: { type: "number" },
                    experience: { type: "number" },
                    keywords: { type: "number" },
                    education: { type: "number" },
                    formatting: { type: "number" },
                  },
                  required: ["skills", "experience", "keywords", "education", "formatting"],
                },
                ats_score: { type: "number", description: "0-100 total ATS score." },
                suggestions: { type: "array", items: { type: "string" }, description: "Concrete improvement suggestions." },
                certifications: {
                  type: "array",
                  description: "Certifications, licenses, or completed courses found in the resume.",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Name of the certification or course." },
                      issuing_org: { type: "string", description: "Issuing body (e.g. AWS, Google, Coursera). Empty string if unknown." },
                    },
                    required: ["name", "issuing_org"],
                  },
                },
              },
              required: ["summary", "skills", "education", "experience", "score_breakdown", "ats_score", "suggestions", "certifications"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_resume_analysis" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit reached. Please try again in a moment." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Workspace settings." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      return json({ error: "AI analysis failed" }, 500);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "No structured analysis returned" }, 500);

    const analysis = JSON.parse(toolCall.function.arguments);

    const { data: inserted, error: dbErr } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_name: fileName ?? "resume.txt",
        file_path: filePath ?? null,
        raw_text: resumeText.slice(0, 50000),
        skills: analysis.skills,
        education: analysis.education,
        experience: analysis.experience,
        ats_score: Math.round(analysis.ats_score),
        score_breakdown: analysis.score_breakdown,
        suggestions: analysis.suggestions,
        summary: analysis.summary,
      })
      .select()
      .single();

    if (dbErr) {
      console.error("DB insert error:", dbErr);
      return json({ error: dbErr.message }, 500);
    }

    // Persist extracted certifications (de-duplicate by name per user)
    const certs = Array.isArray(analysis.certifications) ? analysis.certifications : [];
    if (certs.length > 0) {
      const { data: existing } = await supabase
        .from("certifications")
        .select("name")
        .eq("user_id", user.id);
      const existingNames = new Set((existing ?? []).map((c: any) => c.name.toLowerCase().trim()));
      const toInsert = certs
        .filter((c: any) => c?.name && !existingNames.has(String(c.name).toLowerCase().trim()))
        .map((c: any) => ({
          user_id: user.id,
          name: String(c.name).slice(0, 200),
          issuing_org: c.issuing_org ? String(c.issuing_org).slice(0, 200) : null,
          source: "resume",
          resume_id: inserted.id,
        }));
      if (toInsert.length > 0) {
        const { error: certErr } = await supabase.from("certifications").insert(toInsert);
        if (certErr) console.error("Cert insert error:", certErr);
      }
    }

    return json({ resume: inserted, certifications_added: certs.length });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
