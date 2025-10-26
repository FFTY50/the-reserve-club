-- Add features column to tier_definitions
ALTER TABLE tier_definitions 
ADD COLUMN IF NOT EXISTS features JSONB;

-- Update Reserve Select tier
UPDATE tier_definitions
SET 
  display_name = 'Reserve Select',
  monthly_price = 47,
  monthly_pours = 2,
  description = '2 complimentary pours per month with access to members-only tastings',
  features = '[
    "2 complimentary pours per month (select wines)",
    "Invitations to members-only tastings and social experiences",
    "Access to the Reserve Member Newsletter featuring wine insights, pairings, and behind-the-scenes updates",
    "Priority notification of public events and releases",
    "Personalized birthday pour",
    "Note: VIP Lounge access is not included in this tier"
  ]'::jsonb
WHERE tier_name = 'select';

-- Update Reserve Premier tier
UPDATE tier_definitions
SET 
  display_name = 'Reserve Premier',
  monthly_price = 97,
  monthly_pours = 4,
  description = '4 complimentary pours per month with VIP Lounge access',
  features = '[
    "4 complimentary pours per month (premium selections)",
    "Scheduled access to the VIP Lounge by reservation (when available)",
    "Invitations to quarterly members-only events",
    "Priority reservation access for public events and collaborations"
  ]'::jsonb
WHERE tier_name = 'premier';

-- Update Reserve Elite tier
UPDATE tier_definitions
SET 
  display_name = 'Reserve Elite',
  monthly_price = 147,
  monthly_pours = 6,
  description = '6 complimentary pours per month including rare and reserve wines',
  features = '[
    "6 complimentary pours per month, including rare and reserve wines",
    "Scheduled VIP Lounge access with up to two guests per visit (when not privately booked)",
    "First access to all event releases and signature experiences",
    "Private sommelier consultation once per quarter",
    "Invitation to the Annual Estate Gala",
    "Recognition on the Founders Wall for inaugural members"
  ]'::jsonb
WHERE tier_name = 'elite';

-- Update Reserve Household tier
UPDATE tier_definitions
SET 
  display_name = 'Reserve Household',
  monthly_price = 197,
  monthly_pours = 12,
  description = '12 complimentary pours shared by two household members with full Elite benefits',
  features = '[
    "12 complimentary pours shared by two household members",
    "All benefits from the Reserve Elite tier",
    "Both members receive full access to VIP Lounge privileges, events, and sommelier consultations",
    "Personalized welcome gift set for two",
    "Note: Household memberships are limited and verified for same-household members only"
  ]'::jsonb
WHERE tier_name = 'household';