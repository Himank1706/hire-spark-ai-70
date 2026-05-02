-- 1. Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'employer', 'job_seeker');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-assign job_seeker role on signup (extend existing handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'job_seeker')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience_level TEXT,
  experience_years_min INTEGER DEFAULT 0,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'seed',
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated browse active jobs" ON public.jobs
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Employers insert own jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = employer_id AND public.has_role(auth.uid(), 'employer'));
CREATE POLICY "Employers update own jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = employer_id);
CREATE POLICY "Employers delete own jobs" ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = employer_id);
CREATE POLICY "Admins manage all jobs" ON public.jobs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_jobs_active ON public.jobs(is_active);
CREATE INDEX idx_jobs_employer ON public.jobs(employer_id);

-- 3. Applications
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  match_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own applications" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own applications" ON public.job_applications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own applications" ON public.job_applications
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Employers view applicants for own jobs" ON public.job_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.employer_id = auth.uid())
  );

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_applications_user ON public.job_applications(user_id);
CREATE INDEX idx_applications_job ON public.job_applications(job_id);

-- 4. Certifications
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_org TEXT,
  issue_date DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own certs" ON public.certifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own certs" ON public.certifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own certs" ON public.certifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own certs" ON public.certifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_certs_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_certs_user ON public.certifications(user_id);

-- 5. Seed jobs
INSERT INTO public.jobs (title, company, location, description, required_skills, experience_level, experience_years_min, salary_min, salary_max, source) VALUES
('Frontend Developer', 'Acme Corp', 'Remote', 'Build modern web UIs with React and TypeScript. Work on a design system used across products.', '["React","TypeScript","HTML","CSS","Tailwind","Git"]', 'Mid', 2, 70000, 95000, 'seed'),
('Senior React Engineer', 'Lumen Labs', 'San Francisco, CA', 'Lead frontend architecture, mentor juniors, ship features in a high-performance React app.', '["React","TypeScript","Redux","Next.js","Jest","GraphQL"]', 'Senior', 5, 130000, 170000, 'seed'),
('Full Stack Developer', 'Brightwave', 'Remote', 'Own features end-to-end across Node.js APIs and React frontends. Postgres + AWS.', '["Node.js","React","PostgreSQL","AWS","TypeScript","REST"]', 'Mid', 3, 90000, 120000, 'seed'),
('Backend Engineer (Python)', 'DataForge', 'Berlin', 'Design scalable APIs in Python. Work with Postgres, Redis, and event-driven systems.', '["Python","Django","PostgreSQL","Redis","Docker","REST"]', 'Mid', 3, 75000, 105000, 'seed'),
('Junior Web Developer', 'Pixel Studio', 'Remote', 'Entry-level role building marketing websites and small web apps.', '["HTML","CSS","JavaScript","Git"]', 'Junior', 0, 45000, 60000, 'seed'),
('Data Scientist', 'InsightAI', 'New York, NY', 'Build ML models for customer churn and recommendation. Heavy Python + SQL.', '["Python","Pandas","scikit-learn","SQL","Statistics","TensorFlow"]', 'Mid', 3, 110000, 145000, 'seed'),
('Machine Learning Engineer', 'NeuroStack', 'Remote', 'Productionize ML models. MLOps with Docker, Kubernetes, and AWS SageMaker.', '["Python","PyTorch","Docker","Kubernetes","AWS","MLOps"]', 'Senior', 4, 130000, 175000, 'seed'),
('Data Analyst', 'MetricsHub', 'London', 'Analyze product data, build dashboards, communicate insights to stakeholders.', '["SQL","Python","Tableau","Excel","Statistics"]', 'Junior', 1, 55000, 75000, 'seed'),
('DevOps Engineer', 'CloudNine', 'Remote', 'Manage CI/CD, Kubernetes clusters, and cloud infrastructure across AWS and GCP.', '["AWS","Kubernetes","Docker","Terraform","Linux","CI/CD"]', 'Mid', 3, 100000, 140000, 'seed'),
('Cloud Architect', 'Stratus Inc', 'Austin, TX', 'Design enterprise cloud architectures on AWS. Lead migration projects.', '["AWS","Azure","Terraform","Networking","Security","Architecture"]', 'Senior', 7, 150000, 200000, 'seed'),
('Mobile Developer (React Native)', 'GoMobile', 'Remote', 'Build cross-platform mobile apps with React Native and TypeScript.', '["React Native","TypeScript","iOS","Android","Redux"]', 'Mid', 2, 80000, 110000, 'seed'),
('iOS Developer', 'Appify', 'Toronto', 'Native iOS development with Swift and SwiftUI.', '["Swift","SwiftUI","iOS","Xcode","REST"]', 'Mid', 3, 90000, 125000, 'seed'),
('Android Developer', 'DroidWorks', 'Bangalore', 'Kotlin-based Android apps with Jetpack Compose.', '["Kotlin","Android","Jetpack Compose","REST","Git"]', 'Mid', 3, 25000, 45000, 'seed'),
('UX/UI Designer', 'Designly', 'Remote', 'Design user-centered interfaces. Figma, prototyping, design systems.', '["Figma","UX","UI","Prototyping","Design Systems"]', 'Mid', 3, 70000, 95000, 'seed'),
('Product Manager', 'OrbitProd', 'Seattle, WA', 'Own product roadmap for a B2B SaaS. Work cross-functionally.', '["Product Management","Agile","Jira","Analytics","Roadmapping"]', 'Senior', 5, 120000, 160000, 'seed'),
('QA Automation Engineer', 'Testify', 'Remote', 'Build automated test suites in Cypress and Playwright.', '["JavaScript","Cypress","Playwright","Selenium","CI/CD"]', 'Mid', 2, 70000, 95000, 'seed'),
('Java Backend Developer', 'Enterprixe', 'Dublin', 'Spring Boot microservices for a financial platform.', '["Java","Spring Boot","PostgreSQL","Kafka","Docker"]', 'Mid', 4, 75000, 105000, 'seed'),
('Go Engineer', 'Velocity Systems', 'Remote', 'High-throughput services in Go. Distributed systems.', '["Go","gRPC","Kubernetes","PostgreSQL","Redis"]', 'Senior', 4, 120000, 160000, 'seed'),
('Cybersecurity Analyst', 'SecuraNet', 'Washington, DC', 'Monitor and respond to security incidents. SIEM + threat hunting.', '["Security","SIEM","Networking","Linux","Python"]', 'Mid', 3, 95000, 130000, 'seed'),
('Site Reliability Engineer', 'NinesCloud', 'Remote', 'Own platform reliability. Observability, on-call, performance tuning.', '["Linux","Kubernetes","Prometheus","Grafana","Go","AWS"]', 'Senior', 5, 130000, 170000, 'seed'),
('Data Engineer', 'Pipeline.io', 'Remote', 'Build batch and streaming data pipelines with Spark and Airflow.', '["Python","Spark","Airflow","SQL","AWS","Kafka"]', 'Mid', 3, 105000, 140000, 'seed'),
('AI Research Engineer', 'OpenMinds', 'Zurich', 'Research and prototype LLM-powered systems.', '["Python","PyTorch","Transformers","NLP","LLM","Research"]', 'Senior', 4, 140000, 190000, 'seed'),
('Junior Data Analyst', 'StartGrowth', 'Remote', 'Entry-level analytics role. SQL, Excel, basic Python.', '["SQL","Excel","Python","Statistics"]', 'Junior', 0, 45000, 60000, 'seed'),
('Technical Writer', 'DocuMint', 'Remote', 'Write developer docs and API references for a dev-tools company.', '["Writing","Markdown","Git","API","Documentation"]', 'Mid', 2, 65000, 90000, 'seed'),
('Solutions Engineer', 'BridgeCo', 'New York, NY', 'Pre-sales engineering. Demos, POCs, integrations.', '["JavaScript","Python","REST","Communication","SQL"]', 'Mid', 3, 100000, 140000, 'seed'),
('Web3 Developer', 'ChainBlock', 'Remote', 'Smart contracts in Solidity, dApp frontends in React.', '["Solidity","React","Ethereum","Web3.js","TypeScript"]', 'Mid', 2, 110000, 160000, 'seed'),
('Game Developer (Unity)', 'PixelPlay', 'Montreal', 'Build mobile games in Unity with C#.', '["C#","Unity","Game Design","3D","Mobile"]', 'Mid', 3, 70000, 100000, 'seed'),
('Embedded Systems Engineer', 'CircuitWorks', 'Munich', 'Firmware in C/C++ for IoT devices.', '["C","C++","Embedded","RTOS","Linux","Hardware"]', 'Senior', 5, 80000, 115000, 'seed'),
('Salesforce Developer', 'CloudCRM', 'Remote', 'Apex, Lightning Web Components, Salesforce integrations.', '["Salesforce","Apex","JavaScript","SOQL","REST"]', 'Mid', 3, 90000, 125000, 'seed'),
('Junior Frontend Developer', 'Webcrafters', 'Remote', 'Entry-level role building React UIs from designs.', '["React","JavaScript","HTML","CSS","Git"]', 'Junior', 0, 50000, 70000, 'seed');