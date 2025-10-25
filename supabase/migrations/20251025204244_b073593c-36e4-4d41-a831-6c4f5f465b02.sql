-- Add columns to membership_applications table for progress tracking and tier selection
ALTER TABLE membership_applications
ADD COLUMN selected_tier customer_tier NULL,
ADD COLUMN current_step integer DEFAULT 1,
ADD COLUMN is_complete boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_membership_applications_user_status ON membership_applications(user_id, status) WHERE status = 'pending';