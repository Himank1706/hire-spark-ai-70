-- Allow a job applicant to notify the employer who owns the job they applied to.
CREATE POLICY "Applicants notify employer"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'applicant'
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.employer_id = notifications.user_id
      AND EXISTS (
        SELECT 1 FROM public.job_applications a
        WHERE a.job_id = j.id AND a.user_id = auth.uid()
      )
  )
);

-- Real-time updates for applicants section
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
ALTER TABLE public.job_applications REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;