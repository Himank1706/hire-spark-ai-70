INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'employer'::public.app_role
FROM auth.users u
WHERE u.raw_user_meta_data->>'intent' = 'employer'
ON CONFLICT DO NOTHING;