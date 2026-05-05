-- Resume: structured feedback fields
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS strengths jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weaknesses jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS missing_keywords jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS formatting_issues jsonb DEFAULT '[]'::jsonb;

-- Learning plans
CREATE TABLE IF NOT EXISTS public.learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resume_id uuid,
  target_role text NOT NULL,
  summary text,
  total_weeks int NOT NULL DEFAULT 4,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plans" ON public.learning_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plans" ON public.learning_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plans" ON public.learning_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own plans" ON public.learning_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_learning_plans_updated BEFORE UPDATE ON public.learning_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Plan weeks
CREATE TABLE IF NOT EXISTS public.plan_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  title text NOT NULL,
  focus_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_weeks_plan ON public.plan_weeks(plan_id, week_number);

ALTER TABLE public.plan_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own weeks" ON public.plan_weeks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_weeks.plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users insert own weeks" ON public.plan_weeks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_weeks.plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users update own weeks" ON public.plan_weeks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_weeks.plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users delete own weeks" ON public.plan_weeks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_weeks.plan_id AND p.user_id = auth.uid()));

-- Plan tasks
CREATE TABLE IF NOT EXISTS public.plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.plan_weeks(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT 'lesson', -- lesson | resource | project
  title text NOT NULL,
  description text,
  url text,
  provider text, -- YouTube, Coursera, Docs, etc.
  estimated_hours numeric,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_week ON public.plan_tasks(week_id, sort_order);

ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tasks" ON public.plan_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_tasks.plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users insert own tasks" ON public.plan_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_tasks.plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users update own tasks" ON public.plan_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_tasks.plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users delete own tasks" ON public.plan_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.learning_plans p WHERE p.id = plan_tasks.plan_id AND p.user_id = auth.uid()));

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'reminder', -- reminder | info | success
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_tasks;