CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role := CASE
    WHEN NEW.raw_user_meta_data->>'intent' = 'employer' THEN 'employer'::public.app_role
    ELSE 'job_seeker'::public.app_role
  END;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;