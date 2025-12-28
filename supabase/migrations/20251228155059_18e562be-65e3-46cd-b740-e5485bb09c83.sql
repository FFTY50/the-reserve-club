-- Add secondary_user_id column to customers table for family/household memberships
ALTER TABLE customers ADD COLUMN secondary_user_id uuid REFERENCES auth.users(id);

-- Create index for efficient lookups
CREATE INDEX idx_customers_secondary_user ON customers(secondary_user_id) WHERE secondary_user_id IS NOT NULL;

-- RLS policy for secondary users to view their family's customer record
CREATE POLICY "Secondary users can view family customer data"
ON customers FOR SELECT
USING (secondary_user_id = auth.uid());

-- RLS policy for primary users to update their customer record (to add/remove secondary)
CREATE POLICY "Primary users can update own customer record"
ON customers FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());