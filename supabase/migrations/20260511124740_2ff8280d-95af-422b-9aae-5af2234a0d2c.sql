-- Add detailed application fields to job_applications
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS cover_letter text;

-- Allow employers to read the resume row of applicants for their jobs (so they can View Resume / see ATS)
DROP POLICY IF EXISTS "Employers view resumes of applicants" ON public.resumes;
CREATE POLICY "Employers view resumes of applicants"
ON public.resumes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.resume_id = resumes.id AND j.employer_id = auth.uid()
  )
);

-- Allow employers to read the resume file from storage for applicants on their jobs
DROP POLICY IF EXISTS "Employers download applicant resumes" ON storage.objects;
CREATE POLICY "Employers download applicant resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND EXISTS (
    SELECT 1 FROM public.resumes r
    JOIN public.job_applications a ON a.resume_id = r.id
    JOIN public.jobs j ON j.id = a.job_id
    WHERE r.file_path = storage.objects.name
      AND j.employer_id = auth.uid()
  )
);