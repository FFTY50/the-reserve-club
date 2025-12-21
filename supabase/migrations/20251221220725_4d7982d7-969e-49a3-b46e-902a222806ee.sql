-- Add max_subscriptions column to tier_definitions
ALTER TABLE public.tier_definitions 
ADD COLUMN max_subscriptions integer DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.tier_definitions.max_subscriptions IS 'Maximum number of subscriptions allowed. NULL means unlimited.';

-- Set limits for Premier, Elite, and Household tiers (50 each), Select remains unlimited (NULL)
UPDATE public.tier_definitions SET max_subscriptions = 50 WHERE tier_name = 'premier';
UPDATE public.tier_definitions SET max_subscriptions = 50 WHERE tier_name = 'elite';
UPDATE public.tier_definitions SET max_subscriptions = 50 WHERE tier_name = 'household';
-- Select tier stays NULL (unlimited)