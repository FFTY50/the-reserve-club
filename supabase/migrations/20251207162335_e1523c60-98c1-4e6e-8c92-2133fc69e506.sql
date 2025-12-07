-- Create a function to seed the default admin account
-- This runs once when the database is initialized

-- First, let's create a table to track if seeding has been done
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS but allow only admins to modify
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system settings (for non-sensitive configs)
CREATE POLICY "Anyone can view system settings"
ON public.system_settings FOR SELECT
USING (true);

-- Only admins can modify system settings
CREATE POLICY "Admins can modify system settings"
ON public.system_settings FOR ALL
USING (is_admin(auth.uid()));

-- Insert a setting to track admin seeding status
-- The actual admin creation will happen via edge function on first access
INSERT INTO public.system_settings (key, value)
VALUES ('admin_seeding', '{"seeded": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;