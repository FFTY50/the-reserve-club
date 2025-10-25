-- Add UPDATE policy for users to update their own pending applications
CREATE POLICY "Users can update own pending applications"
ON membership_applications
FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');