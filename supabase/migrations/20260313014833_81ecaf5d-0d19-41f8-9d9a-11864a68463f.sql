
-- Promotional accounts tracking table
CREATE TABLE public.promotional_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  tier customer_tier NOT NULL,
  email text NOT NULL,
  total_months integer NOT NULL,
  months_remaining integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_by uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.promotional_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view promotional accounts"
  ON public.promotional_accounts FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert promotional accounts"
  ON public.promotional_accounts FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update promotional accounts"
  ON public.promotional_accounts FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete promotional accounts"
  ON public.promotional_accounts FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Customers can view their own promo (so they see it's active)
CREATE POLICY "Customers can view own promo"
  ON public.promotional_accounts FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
