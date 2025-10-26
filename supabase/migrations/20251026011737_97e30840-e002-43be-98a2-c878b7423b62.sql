-- Fix customer user_id security issue
-- Make user_id NOT NULL (foreign key constraint already exists)

-- Make user_id NOT NULL
ALTER TABLE public.customers 
ALTER COLUMN user_id SET NOT NULL;

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- Add comment documenting the security requirement
COMMENT ON COLUMN public.customers.user_id IS 'Required for RLS policies. Must reference auth.users(id). Cannot be NULL for security.';
