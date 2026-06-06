
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'trey@50dollarmanager.com';

  UPDATE auth.users
  SET encrypted_password = crypt('Trey2026!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now(),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"first_name":"Trey","last_name":"Staff","role":"staff"}'::jsonb
  WHERE id = uid;

  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (uid, 'trey@50dollarmanager.com', 'Trey', 'Staff')
  ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name;

  -- Remove any non-staff roles and add approved staff role
  DELETE FROM public.user_roles WHERE user_id = uid AND role <> 'staff';
  INSERT INTO public.user_roles (user_id, role, is_approved)
  VALUES (uid, 'staff', true)
  ON CONFLICT (user_id, role) DO UPDATE SET is_approved = true;
END $$;
