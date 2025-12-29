import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TierAvailability {
  tier_name: string;
  display_name: string;
  monthly_price: number;
  monthly_pours: number;
  description: string | null;
  // Removed: max_subscriptions, current_subscriptions - business intelligence
  available: number | null;
  status: 'available' | 'limited' | 'low' | 'critical' | 'sold_out';
  urgency_message: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active tier definitions
    const { data: tiers, error: tiersError } = await supabase
      .from('tier_definitions')
      .select('tier_name, display_name, monthly_price, monthly_pours, description, max_subscriptions')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });

    if (tiersError) {
      console.error('Error fetching tiers:', tiersError);
      throw new Error('Failed to fetch tier definitions');
    }

    // Count active subscriptions per tier
    const { data: subscriptionCounts, error: countError } = await supabase
      .from('memberships')
      .select('tier')
      .eq('status', 'active');

    if (countError) {
      console.error('Error counting subscriptions:', countError);
      throw new Error('Failed to count subscriptions');
    }

    // Calculate counts per tier
    const tierCounts: Record<string, number> = {};
    subscriptionCounts?.forEach((sub) => {
      tierCounts[sub.tier] = (tierCounts[sub.tier] || 0) + 1;
    });

    // Build availability response
    const availability: TierAvailability[] = tiers.map((tier) => {
      const currentCount = tierCounts[tier.tier_name] || 0;
      const maxSubs = tier.max_subscriptions;
      
      // Calculate availability
      let available: number | null = null;
      let status: TierAvailability['status'] = 'available';
      let urgencyMessage: string | null = null;

      if (maxSubs !== null) {
        available = Math.max(0, maxSubs - currentCount);
        
        if (available === 0) {
          status = 'sold_out';
          urgencyMessage = 'Sold Out';
        } else if (available <= 5) {
          status = 'critical';
          urgencyMessage = `Only ${available} left - Act now!`;
        } else if (available <= 10) {
          status = 'low';
          urgencyMessage = `Less than 10 remaining!`;
        } else if (available <= 20) {
          status = 'limited';
          urgencyMessage = 'Limited availability';
        }
      }

      return {
        tier_name: tier.tier_name,
        display_name: tier.display_name,
        monthly_price: tier.monthly_price,
        monthly_pours: tier.monthly_pours,
        description: tier.description,
        // Note: max_subscriptions, current_subscriptions excluded for security
        // Only expose availability status and urgency messaging
        available,
        status,
        urgency_message: urgencyMessage,
      };
    });

    console.log('Tier availability calculated:', availability.map(t => ({ 
      tier: t.tier_name, 
      available: t.available,
      status: t.status 
    })));

    return new Response(
      JSON.stringify({ tiers: availability }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-tier-availability:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
