import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

async function checkRateLimit(supabase: any, identifier: string, endpoint: string): Promise<boolean> {
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();
  
  try {
    // Try to get existing rate limit record
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .single();
    
    if (existing) {
      const windowAge = now - existing.window_start;
      
      if (windowAge < RATE_LIMIT_WINDOW_MS) {
        // Still in current window
        if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
          return false; // Rate limited
        }
        // Increment count
        await supabase
          .from('rate_limits')
          .update({ count: existing.count + 1 })
          .eq('key', key);
      } else {
        // New window - reset
        await supabase
          .from('rate_limits')
          .update({ count: 1, window_start: now })
          .eq('key', key);
      }
    } else {
      // Create new record
      await supabase
        .from('rate_limits')
        .insert({ key, count: 1, window_start: now });
    }
    
    return true; // Not rate limited
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow request on error to prevent false positives
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      }
    });

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (use service role client)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const allowed = await checkRateLimit(supabaseAdmin, user.id, 'create-checkout');
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many checkout attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input - no longer requires applicationId
    const requestSchema = z.object({
      tierName: z.enum(['select', 'premier', 'elite', 'household']),
      userId: z.string().uuid(),
      preferences: z.record(z.any()).optional() // Optional wine preferences
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.format());
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tierName, userId, preferences } = validationResult.data;

    // Verify user owns this request
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot create checkout for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tier definition to get stripe_price_id and max_subscriptions
    const { data: tier, error: tierError } = await supabaseAdmin
      .from('tier_definitions')
      .select('stripe_price_id, display_name, monthly_price, max_subscriptions')
      .eq('tier_name', tierName)
      .single();

    if (tierError || !tier) {
      console.error('Tier fetch failed for tier:', tierName);
      return new Response(
        JSON.stringify({ error: 'Unable to process request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tier.stripe_price_id) {
      console.error('Missing Stripe Price ID for tier:', tierName);
      return new Response(
        JSON.stringify({ error: 'Membership tier not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use atomic inventory locking to check and reserve slot
    const { data: reserveResult, error: reserveError } = await supabaseAdmin
      .rpc('reserve_tier_slot', { 
        _tier_name: tierName, 
        _user_id: userId 
      });

    if (reserveError) {
      console.error('Error checking inventory with atomic lock:', reserveError);
      return new Response(
        JSON.stringify({ error: 'Unable to verify availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reserveResult.success) {
      console.log(`Tier ${tierName} is sold out (atomic check): ${reserveResult.current}/${reserveResult.max}`);
      return new Response(
        JSON.stringify({ error: 'This membership tier is sold out. Please choose another tier.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tier ${tierName} availability (atomic): ${reserveResult.available}/${reserveResult.max}`);

    // Fetch user profile for email and name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch failed');
      return new Response(
        JSON.stringify({ error: 'Unable to process request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const origin = req.headers.get('origin') || 'http://localhost:8080';

    // Create Stripe Checkout Session - pass preferences in metadata
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: tier.stripe_price_id,
          quantity: 1,
        },
      ],
      customer_email: profile.email,
      metadata: {
        userId,
        tierName,
        // Store preferences as JSON string in metadata (Stripe has 500 char limit per value)
        preferences: preferences ? JSON.stringify(preferences).substring(0, 500) : '',
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/join?cancelled=true`,
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-checkout');
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});