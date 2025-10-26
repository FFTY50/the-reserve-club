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

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
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
    } else {
      event = JSON.parse(body);
      console.warn('Webhook secret not configured - skipping signature verification');
    }

    console.log('Processing webhook event:', event.type);

    // Define validation schemas
    const metadataSchema = z.object({
      applicationId: z.string().uuid('Invalid application ID format'),
      userId: z.string().uuid('Invalid user ID format'),
      tierName: z.enum(['select', 'premier', 'elite', 'household'], {
        errorMap: () => ({ message: 'Invalid tier name' })
      })
    });

    const stripeIdSchema = z.string().min(1, 'Invalid Stripe ID');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completed:', session.id);

        // Validate metadata
        const metadataResult = metadataSchema.safeParse(session.metadata);
        if (!metadataResult.success) {
          console.error('Invalid metadata:', metadataResult.error.format());
          throw new Error(`Invalid metadata: ${metadataResult.error.issues[0].message}`);
        }

        const { applicationId, userId, tierName } = metadataResult.data;

        // Validate and retrieve subscription ID from session
        const subscriptionIdResult = stripeIdSchema.safeParse(session.subscription);
        const customerIdResult = stripeIdSchema.safeParse(session.customer);
        
        if (!subscriptionIdResult.success || !customerIdResult.success) {
          throw new Error('Invalid Stripe subscription or customer ID');
        }
        
        const subscriptionId = subscriptionIdResult.data;
        const customerId = customerIdResult.data;

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
