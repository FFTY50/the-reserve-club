-- Add explicit policy to require authentication for the profiles table
-- This prevents anonymous users from accessing any profile data
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add explicit policy to require authentication for the customers table
-- This prevents anonymous users from accessing any customer data including activation_key
CREATE POLICY "Require authentication for customers"
ON public.customers
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);