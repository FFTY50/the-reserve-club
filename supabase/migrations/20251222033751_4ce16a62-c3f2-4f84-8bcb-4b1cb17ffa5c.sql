-- Create QR verification audit log table
CREATE TABLE public.qr_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  token_jti TEXT,
  verification_result TEXT NOT NULL, -- 'success', 'failed', 'expired', 'invalid'
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qr_verification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all QR verification logs"
ON public.qr_verification_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Staff can insert logs (via service role in edge function, but policy needed)
CREATE POLICY "Service role can insert logs"
ON public.qr_verification_logs
FOR INSERT
WITH CHECK (true);

-- Create index for quick lookups
CREATE INDEX idx_qr_verification_logs_created_at ON public.qr_verification_logs(created_at DESC);
CREATE INDEX idx_qr_verification_logs_customer_id ON public.qr_verification_logs(customer_id);