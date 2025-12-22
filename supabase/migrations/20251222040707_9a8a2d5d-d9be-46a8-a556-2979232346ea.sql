-- Fix system_settings public read exposure
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view system settings" ON system_settings;

-- Create new policy that only allows authenticated users to read settings
CREATE POLICY "Authenticated users can view system settings"
ON system_settings FOR SELECT
TO authenticated
USING (true);