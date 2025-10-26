-- Recalculate pours_balance for all customers based on new tier maximums
-- and actual usage in current billing period

UPDATE customers c
SET pours_balance = GREATEST(0, 
  COALESCE(
    (
      SELECT td.monthly_pours - COALESCE(SUM(p.quantity), 0)
      FROM memberships m
      JOIN tier_definitions td ON td.tier_name = m.tier
      LEFT JOIN pours p ON p.customer_id = c.id 
        AND p.created_at >= m.billing_period_start
        AND (m.billing_period_end IS NULL OR p.created_at < m.billing_period_end)
        AND p.status = 'redeemed'
      WHERE m.customer_id = c.id
        AND m.status = 'active'
      GROUP BY td.monthly_pours
      LIMIT 1
    ),
    0
  )
)
WHERE EXISTS (
  SELECT 1 FROM memberships
  WHERE customer_id = c.id AND status = 'active'
);