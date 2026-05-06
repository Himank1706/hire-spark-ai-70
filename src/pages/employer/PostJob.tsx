import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(1).max(120),
  location: z.string().trim().max(120).optional(),
  job_type: z.string().trim().max(40).optional(),
  description: z.string().trim().min(20).max(5000),
  skills: z.string().trim().min(1).max(500),
  experience_level: z.string().trim().max(40).optional(),
  experience_years_min: z.coerce.number().int().min(0).max(50),
  salary_min: z.coerce.number().int().min(0).optional(),
  salary_max: z.coerce.number().int().min(0).optional(),
});

const PostJob = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", company: "", location: "", job_type: "Full-time",
    description: "", skills: "", experience_level: "Mid",
    experience_years_min: "2", salary_min: "", salary_max: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const skills = parsed.data.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("jobs").insert({
      employer_id: user.id,
      title: parsed.data.title,
      company: parsed.data.company,
      location: parsed.data.location || null,
      description: `${parsed.data.job_type ? `[${parsed.data.job_type}] ` : ""}${parsed.data.description}`,
      required_skills: skills,
      experience_level: parsed.data.experience_level || null,
      experience_years_min: parsed.data.experience_years_min,
      salary_min: parsed.data.salary_min || null,
      salary_max: parsed.data.salary_max || null,
      source: "employer",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Job posted — candidates will see it instantly");
    nav("/employer/jobs");
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><PlusCircle className="h-7 w-7 text-secondary" /> Post a Job</h1>
      <p className="text-muted-foreground mt-2">Once published, this role goes live instantly to all job seekers.</p>

      <Card className="mt-8 p-6">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Job title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Company *</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Remote, Berlin, etc." />
          </div>
          <div>
            <Label>Job type</Label>
            <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Full-time", "Part-time", "Contract", "Internship", "Freelance"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Experience level</Label>
            <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Junior", "Mid", "Senior", "Lead", "Principal"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Min years experience</Label>
            <Input type="number" value={form.experience_years_min} onChange={(e) => setForm({ ...form, experience_years_min: e.target.value })} />
          </div>
          <div>
            <Label>Salary min</Label>
            <Input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} />
          </div>
          <div>
            <Label>Salary max</Label>
            <Input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Required skills (comma-separated) *</Label>
            <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, TypeScript, Node.js" required />
          </div>
          <div className="md:col-span-2">
            <Label>Job description *</Label>
            <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="hero" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Post Job
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PostJob;
