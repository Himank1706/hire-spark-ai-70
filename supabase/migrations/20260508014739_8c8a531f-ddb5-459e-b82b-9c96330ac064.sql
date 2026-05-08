CREATE OR REPLACE FUNCTION public.complete_role_onboarding(_role public.app_role, _full_name text DEFAULT NULL)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  resolved_role public.app_role;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _role NOT IN ('job_seeker'::public.app_role, 'employer'::public.app_role) THEN
    RAISE EXCEPTION 'Unsupported account role';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (current_user_id, COALESCE(NULLIF(trim(_full_name), ''), ''))
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(trim(_full_name), ''), public.profiles.full_name),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = current_user_id AND role = 'employer'::public.app_role)
      THEN 'employer'::public.app_role
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = current_user_id AND role = 'admin'::public.app_role)
      THEN 'admin'::public.app_role
    ELSE 'job_seeker'::public.app_role
  END INTO resolved_role;

  RETURN resolved_role;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_role_onboarding(public.app_role, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_role_onboarding(public.app_role, text) TO authenticated;