-- Fix RLS policies for system_settings table
-- Drop the overly broad ALL policy and create specific policies

DROP POLICY IF EXISTS "Admins can modify system settings" ON public.system_settings;

-- Admins can insert system settings
CREATE POLICY "Admins can insert system settings"
ON public.system_settings FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Admins can update system settings
CREATE POLICY "Admins can update system settings"
ON public.system_settings FOR UPDATE
USING (is_admin(auth.uid()));

-- Admins can delete system settings
CREATE POLICY "Admins can delete system settings"
ON public.system_settings FOR DELETE
USING (is_admin(auth.uid()));