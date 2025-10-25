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
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: corsHeaders }
        );
      }
    } else {
      event = JSON.parse(body);
      console.warn('Webhook secret not configured - skipping signature verification');
    }

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completed:', session.id);

        const { applicationId, userId, tierName } = session.metadata || {};

        if (!applicationId || !userId || !tierName) {
          console.error('Missing metadata in session:', session.metadata);
          throw new Error('Missing required metadata');
        }

        // Retrieve subscription ID from session
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Fetch tier definition for monthly_pours and monthly_price
        const { data: tier, error: tierError } = await supabase
          .from('tier_definitions')
          .select('monthly_pours, monthly_price')
          .eq('tier_name', tierName)
          .single();

        if (tierError || !tier) {
          console.error('Failed to fetch tier:', tierError);
          throw new Error(`Tier "${tierName}" not found`);
        }

        // Update application status to approved
        const { error: appError } = await supabase
          .from('membership_applications')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            is_complete: true,
            notes: 'Automatically approved via Stripe payment',
          })
          .eq('id', applicationId);

        if (appError) {
          console.error('Failed to update application:', appError);
          throw new Error('Failed to approve application');
        }

        // Create customer record
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: userId,
            tier: tierName,
            member_since: new Date().toISOString().split('T')[0],
            pours_balance: tier.monthly_pours,
            status: 'active',
            total_pours_lifetime: 0,
          })
          .select()
          .single();

        if (customerError) {
          console.error('Failed to create customer:', customerError);
          throw new Error('Failed to create customer record');
        }

        console.log('Customer created:', customer.id);

        // Create membership record
        const { error: membershipError } = await supabase
          .from('memberships')
          .insert({
            customer_id: customer.id,
            tier: tierName,
            monthly_price: tier.monthly_price,
            status: 'active',
            start_date: new Date().toISOString().split('T')[0],
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            toast_reference_number: subscriptionId,
          });

        if (membershipError) {
          console.error('Failed to create membership:', membershipError);
          throw new Error('Failed to create membership record');
        }

        console.log('Membership activated successfully for user:', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription cancelled:', subscription.id);

        // Find membership by stripe_subscription_id
        const { data: membership, error: fetchError } = await supabase
          .from('memberships')
          .select('customer_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (fetchError || !membership) {
          console.error('Membership not found for subscription:', subscription.id);
          break;
        }

        // Update membership status
        const { error: membershipError } = await supabase
          .from('memberships')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id);

        if (membershipError) {
          console.error('Failed to update membership status:', membershipError);
        }

        // Update customer status
        const { error: customerError } = await supabase
          .from('customers')
          .update({ status: 'inactive' })
          .eq('id', membership.customer_id);

        if (customerError) {
          console.error('Failed to update customer status:', customerError);
        }

        console.log('Membership cancelled successfully');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);

        const subscriptionId = invoice.subscription as string;

        // Find membership
        const { data: membership, error: fetchError } = await supabase
          .from('memberships')
          .select('customer_id, tier')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (fetchError || !membership) {
          console.error('Membership not found for subscription:', subscriptionId);
          break;
        }

        // Fetch tier to get monthly_pours
        const { data: tier, error: tierError } = await supabase
          .from('tier_definitions')
          .select('monthly_pours')
          .eq('tier_name', membership.tier)
          .single();

        if (tierError || !tier) {
          console.error('Failed to fetch tier:', tierError);
          break;
        }

        // Add pours to customer balance
        const { error: updateError } = await supabase.rpc('increment', {
          table_name: 'customers',
          column_name: 'pours_balance',
          increment_by: tier.monthly_pours,
          row_id: membership.customer_id,
        }).single();

        if (updateError) {
          // Fallback: manually fetch and update
          const { data: customer } = await supabase
            .from('customers')
            .select('pours_balance')
            .eq('id', membership.customer_id)
            .single();

          if (customer) {
            await supabase
              .from('customers')
              .update({ pours_balance: customer.pours_balance + tier.monthly_pours })
              .eq('id', membership.customer_id);
          }
        }

        console.log('Pours renewed for customer:', membership.customer_id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
        // Log for now - future: send notification to customer
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in stripe-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
