import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tierName, applicationId, userId } = await req.json();

    if (!tierName || !applicationId || !userId) {
      throw new Error('Missing required fields: tierName, applicationId, or userId');
    }

    console.log('Creating checkout session for:', { tierName, applicationId, userId });

    // Fetch tier definition to get stripe_price_id
    const { data: tier, error: tierError } = await supabase
      .from('tier_definitions')
      .select('stripe_price_id, display_name, monthly_price')
      .eq('tier_name', tierName)
      .single();

    if (tierError || !tier) {
      console.error('Tier fetch error:', tierError);
      throw new Error(`Tier "${tierName}" not found`);
    }

    if (!tier.stripe_price_id) {
      throw new Error(`Stripe Price ID not configured for tier "${tierName}". Please configure Stripe products first.`);
    }

    // Fetch user profile for email and name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      throw new Error('User profile not found');
    }

    const origin = req.headers.get('origin') || 'http://localhost:8080';

    // Create Stripe Checkout Session
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
        applicationId,
        userId,
        tierName,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/apply?cancelled=true`,
    });

    console.log('Checkout session created:', session.id);

    // Update application with stripe_session_id
    const { error: updateError } = await supabase
      .from('membership_applications')
      .update({ stripe_session_id: session.id })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application with session ID:', updateError);
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
