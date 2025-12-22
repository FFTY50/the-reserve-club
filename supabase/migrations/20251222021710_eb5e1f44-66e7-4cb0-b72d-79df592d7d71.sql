-- Add preferences column to customers table
ALTER TABLE public.customers 
ADD COLUMN preferences JSONB DEFAULT NULL;

-- Migrate existing preference data from membership_applications
UPDATE public.customers c
SET preferences = ma.preferences
FROM public.membership_applications ma
WHERE c.user_id = ma.user_id
  AND ma.preferences IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.preferences IS 'Wine preference survey data collected during signup';