// Generate a personalized learning plan using Lovable AI based on user's resume skills + target role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are an expert technical career coach and curriculum designer.
Given a learner's current skills and a target job role, design a structured weekly roadmap to close the skill gap.
Rules:
- Identify which gap-skills are highest priority based on real industry demand for the target role.
- Build EXACTLY the requested number of weeks. Each week must focus on 1-3 related skills (not all gaps at once).
- Each week needs 3-5 tasks: a mix of "lesson" (concept), "resource" (link to free, well-known content like official docs, YouTube channels such as freeCodeCamp/Fireship/Traversy, Coursera/edX/MDN), and "project" (small mini-project to apply the skill).
- Use REAL, well-known URLs that actually exist (official docs preferred). Do not fabricate obscure links.
- Be concrete. Avoid filler.`;

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

    const { targetRole, weeks = 4, resumeId } = await req.json();
    if (!targetRole || typeof targetRole !== "string" || targetRole.trim().length < 2) {
      return json({ error: "targetRole is required" }, 400);
    }
    const totalWeeks = Math.min(Math.max(parseInt(String(weeks)) || 4, 2), 12);

    // Pull current skills from latest (or specified) resume
    let currentSkills: string[] = [];
    let usedResumeId: string | null = resumeId ?? null;
    const { data: resume } = await supabase
      .from("resumes")
      .select("id, skills")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (resume) {
      currentSkills = (resume.skills as string[]) ?? [];
      if (!usedResumeId) usedResumeId = resume.id;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const userPrompt = `Target role: ${targetRole}
Current skills (${currentSkills.length}): ${currentSkills.join(", ") || "none stated"}
Number of weeks: ${totalWeeks}

Design the roadmap focused on the GAP between current skills and what the target role demands.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_learning_plan",
            description: "Return a structured weekly learning roadmap.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence overview of the roadmap and its goal." },
                missing_skills: { type: "array", items: { type: "string" }, description: "Prioritized list of skills the user lacks for the target role." },
                weeks: {
                  type: "array",
                  description: `Exactly ${totalWeeks} week objects, sequential.`,
                  items: {
                    type: "object",
                    properties: {
                      week_number: { type: "number" },
                      title: { type: "string" },
                      description: { type: "string" },
                      focus_skills: { type: "array", items: { type: "string" } },
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            task_type: { type: "string", enum: ["lesson", "resource", "project"] },
                            title: { type: "string" },
                            description: { type: "string" },
                            url: { type: "string", description: "Real URL (official docs, YouTube, Coursera). Empty string if N/A." },
                            provider: { type: "string", description: "e.g. YouTube, Coursera, Official Docs, MDN. Empty string if N/A." },
                            estimated_hours: { type: "number" },
                          },
                          required: ["task_type", "title", "description", "url", "provider", "estimated_hours"],
                        },
                      },
                    },
                    required: ["week_number", "title", "description", "focus_skills", "tasks"],
                  },
                },
              },
              required: ["summary", "missing_skills", "weeks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_learning_plan" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit reached. Please try again in a moment." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Workspace settings." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      return json({ error: "Plan generation failed" }, 500);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "No structured plan returned" }, 500);
    const plan = JSON.parse(toolCall.function.arguments);

    // Persist
    const { data: planRow, error: planErr } = await supabase
      .from("learning_plans")
      .insert({
        user_id: user.id,
        resume_id: usedResumeId,
        target_role: targetRole.trim(),
        summary: plan.summary,
        total_weeks: totalWeeks,
        is_primary: true, // newest is primary
      })
      .select()
      .single();
    if (planErr) {
      console.error(planErr);
      return json({ error: planErr.message }, 500);
    }

    // Demote previous primaries
    await supabase
      .from("learning_plans")
      .update({ is_primary: false })
      .eq("user_id", user.id)
      .neq("id", planRow.id);

    // Insert weeks + tasks
    for (const w of plan.weeks ?? []) {
      const { data: weekRow, error: weekErr } = await supabase
        .from("plan_weeks")
        .insert({
          plan_id: planRow.id,
          week_number: w.week_number,
          title: w.title,
          description: w.description,
          focus_skills: w.focus_skills ?? [],
        })
        .select()
        .single();
      if (weekErr) { console.error(weekErr); continue; }

      const taskRows = (w.tasks ?? []).map((t: any, i: number) => ({
        plan_id: planRow.id,
        week_id: weekRow.id,
        task_type: t.task_type ?? "lesson",
        title: t.title,
        description: t.description,
        url: t.url || null,
        provider: t.provider || null,
        estimated_hours: t.estimated_hours ?? null,
        sort_order: i,
      }));
      if (taskRows.length > 0) {
        const { error: tErr } = await supabase.from("plan_tasks").insert(taskRows);
        if (tErr) console.error(tErr);
      }
    }

    // Create welcome notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "success",
      title: `Learning plan ready: ${targetRole}`,
      body: `Your ${totalWeeks}-week roadmap is set. Start with Week 1 today!`,
      link: "/app/learning",
    });

    return json({ plan_id: planRow.id, missing_skills: plan.missing_skills });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
