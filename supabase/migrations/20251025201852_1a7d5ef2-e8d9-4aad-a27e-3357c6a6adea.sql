-- Create membership_applications table
CREATE TABLE public.membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_staff_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own applications"
ON public.membership_applications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own applications"
ON public.membership_applications
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view all applications"
ON public.membership_applications
FOR SELECT
USING (has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update all applications"
ON public.membership_applications
FOR UPDATE
USING (has_role(auth.uid(), 'staff'));

-- Trigger for updated_at
CREATE TRIGGER update_membership_applications_updated_at
BEFORE UPDATE ON public.membership_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();