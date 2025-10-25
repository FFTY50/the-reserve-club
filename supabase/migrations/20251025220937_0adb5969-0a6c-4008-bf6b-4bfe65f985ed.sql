-- Update tier_definitions with Stripe Price IDs from production setup
UPDATE tier_definitions
SET stripe_price_id = 'price_1SMFG9ErQ5LGHoZR7KZQrZyJ'
WHERE tier_name = 'select';

UPDATE tier_definitions
SET stripe_price_id = 'price_1SMFIDErQ5LGHoZRZof4eHWB'
WHERE tier_name = 'premier';

UPDATE tier_definitions
SET stripe_price_id = 'price_1SMFIuErQ5LGHoZRAtT8cMZF'
WHERE tier_name = 'elite';

UPDATE tier_definitions
SET stripe_price_id = 'price_1SMFJVErQ5LGHoZRV4lzUwFK'
WHERE tier_name = 'household';