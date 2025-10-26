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

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get customer membership record
    const { data: customer } = await supabase
      .from('customers')
      .select('id, status, user_id')
      .eq('user_id', user.id)
      .single();

    if (!customer) {
      return new Response(
        JSON.stringify({ status: 'no_membership', message: 'No customer record found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Get membership with Stripe subscription ID
    const { data: membership } = await supabase
      .from('memberships')
      .select('stripe_subscription_id, status, customer_id')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!membership || !membership.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ 
          status: 'no_stripe_subscription', 
          message: 'No Stripe subscription found',
          localStatus: membership?.status || 'unknown'
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id);

    // Map Stripe status to our membership status
    let dbStatus: 'active' | 'cancelled' | 'expired';
    let customerStatus: 'active' | 'inactive' | 'suspended';

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      dbStatus = 'active';
      customerStatus = 'active';
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      dbStatus = 'cancelled';
      customerStatus = 'inactive';
    } else if (subscription.status === 'past_due' || subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
      dbStatus = 'expired';
      customerStatus = 'inactive';
    } else {
      dbStatus = 'cancelled';
      customerStatus = 'inactive';
    }

    // Check if status needs updating
    const needsUpdate = membership.status !== dbStatus || customer.status !== customerStatus;

    if (needsUpdate) {
      // Update membership status
      await supabase
        .from('memberships')
        .update({ status: dbStatus })
        .eq('customer_id', customer.id);

      // Update customer status
      await supabase
        .from('customers')
        .update({ status: customerStatus })
        .eq('id', customer.id);

      return new Response(
        JSON.stringify({
          status: 'updated',
          message: 'Subscription status synchronized with Stripe',
          stripeStatus: subscription.status,
          localStatus: dbStatus,
          previousLocalStatus: membership.status,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'in_sync',
        message: 'Subscription status matches Stripe',
        stripeStatus: subscription.status,
        localStatus: membership.status,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: corsHeaders }
    );
  }
});
