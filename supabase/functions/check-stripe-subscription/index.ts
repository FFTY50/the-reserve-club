import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { subscription_id, customer_id } = await req.json();

    const results: Record<string, unknown> = {};

    if (subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscription_id);
        results.subscription = {
          id: sub.id,
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          items: sub.items.data.map(item => ({
            price_id: item.price.id,
            amount: item.price.unit_amount,
            currency: item.price.currency,
            product: item.price.product,
            interval: item.price.recurring?.interval,
          })),
          metadata: sub.metadata,
        };
      } catch (e) {
        results.subscription_error = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    if (customer_id) {
      try {
        const subs = await stripe.subscriptions.list({ customer: customer_id, limit: 10 });
        results.all_subscriptions = subs.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          amount: sub.items.data[0]?.price.unit_amount,
          price_id: sub.items.data[0]?.price.id,
          product: sub.items.data[0]?.price.product,
          created: new Date(sub.created * 1000).toISOString(),
        }));
      } catch (e) {
        results.customer_subs_error = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
