import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

    // Enforce webhook secret is configured
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing Stripe signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;

    // Always verify webhook signature - no conditional logic
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Processing webhook event:', event.type);

    // Define validation schemas - no longer requires applicationId
    const metadataSchema = z.object({
      userId: z.string().uuid('Invalid user ID format'),
      tierName: z.enum(['select', 'premier', 'elite', 'household'], {
        errorMap: () => ({ message: 'Invalid tier name' })
      }),
      preferences: z.string().optional() // JSON string of preferences
    });

    const stripeIdSchema = z.string().min(1, 'Invalid Stripe ID');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completed:', session.id);

        // Validate metadata
        const metadataResult = metadataSchema.safeParse(session.metadata);
        if (!metadataResult.success) {
          console.error('Metadata validation failed');
          throw new Error('Invalid session metadata');
        }

        const { userId, tierName, preferences: preferencesJson } = metadataResult.data;

        // Parse preferences from JSON string
        let preferences = null;
        if (preferencesJson) {
          try {
            preferences = JSON.parse(preferencesJson);
          } catch (e) {
            console.warn('Failed to parse preferences JSON:', e);
          }
        }

        // Validate and retrieve subscription ID from session
        const subscriptionIdResult = stripeIdSchema.safeParse(session.subscription);
        const customerIdResult = stripeIdSchema.safeParse(session.customer);
        
        if (!subscriptionIdResult.success || !customerIdResult.success) {
          throw new Error('Invalid Stripe subscription or customer ID');
        }
        
        const subscriptionId = subscriptionIdResult.data;
        const customerId = customerIdResult.data;

        // Fetch tier definition for monthly_pours, monthly_price, and max_subscriptions
        const { data: tier, error: tierError } = await supabase
          .from('tier_definitions')
          .select('monthly_pours, monthly_price, max_subscriptions')
          .eq('tier_name', tierName)
          .single();

        if (tierError || !tier) {
          console.error('Tier fetch failed');
          throw new Error('Membership tier not found');
        }

        // Use atomic inventory locking for defense-in-depth check
        const { data: reserveResult, error: reserveError } = await supabase
          .rpc('reserve_tier_slot', { 
            _tier_name: tierName, 
            _user_id: userId 
          });

        if (reserveError) {
          console.error('Error checking inventory with atomic lock:', reserveError);
          // Continue processing - user already paid
          console.warn('ALERT: Could not verify inventory - manual review may be needed');
        } else if (!reserveResult.success) {
          console.error(`Tier ${tierName} is at capacity (atomic check): ${reserveResult.current}/${reserveResult.max}`);
          // Log but still process - user already paid. Admin will need to handle.
          console.warn('ALERT: Subscription created for sold-out tier - manual review needed');
        }

        // Upsert customer record with preferences (handles both new signups and renewals)
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .upsert({
            user_id: userId,
            tier: tierName,
            member_since: new Date().toISOString().split('T')[0],
            pours_balance: tier.monthly_pours,
            status: 'active',
            total_pours_lifetime: 0,
            preferences: preferences, // Store wine preferences directly on customer
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (customerError) {
          console.error('Failed to upsert customer:', customerError);
          throw new Error('Failed to create/update customer record');
        }

        console.log('Customer upserted:', customer.id);

        // Cancel any existing active memberships for this customer
        await supabase
          .from('memberships')
          .update({ status: 'cancelled' })
          .eq('customer_id', customer.id)
          .eq('status', 'active');

        // Get subscription to extract billing period
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Create new membership record with billing period
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
            billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            billing_period_end: new Date(subscription.current_period_end * 1000).toISOString()
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
        
        // Validate subscription ID
        const subIdResult = stripeIdSchema.safeParse(subscription.id);
        if (!subIdResult.success) {
          console.error('Invalid subscription ID');
          break;
        }
        
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

        // Validate subscription ID
        const subIdResult = stripeIdSchema.safeParse(invoice.subscription);
        if (!subIdResult.success) {
          console.error('Invalid subscription ID in invoice');
          break;
        }
        
        const subscriptionId = subIdResult.data;

        // Get subscription to extract billing period
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Find and update membership with new billing period (also fetch tier)
        const { data: membership, error: fetchError } = await supabase
          .from('memberships')
          .select('id, customer_id, tier')
          .eq('stripe_subscription_id', subscriptionId)
          .eq('status', 'active')
          .single();

        if (fetchError || !membership) {
          console.error('Membership not found for subscription:', subscriptionId);
          break;
        }

        // Fetch tier definition for monthly_pours
        const { data: tierDef, error: tierError } = await supabase
          .from('tier_definitions')
          .select('monthly_pours')
          .eq('tier_name', membership.tier)
          .single();

        if (tierError || !tierDef) {
          console.error('Tier definition not found for tier:', membership.tier);
        }

        const newPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        const newPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Update membership with billing period from Stripe
        const { error: membershipError } = await supabase
          .from('memberships')
          .update({
            billing_period_start: newPeriodStart,
            billing_period_end: newPeriodEnd
          })
          .eq('id', membership.id);

        if (membershipError) {
          console.error('Error updating membership billing period:', membershipError);
        }

        // Reset pours_balance and update last activity
        const customerUpdate: Record<string, unknown> = { last_activity: new Date().toISOString() };
        if (tierDef) {
          customerUpdate.pours_balance = tierDef.monthly_pours;
        }

        await supabase
          .from('customers')
          .update(customerUpdate)
          .eq('id', membership.customer_id);

        console.log(`Renewal processed for customer ${membership.customer_id}: tier=${membership.tier}, pours_balance reset to ${tierDef?.monthly_pours ?? 'unknown'}, period=${newPeriodStart} to ${newPeriodEnd}`);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});