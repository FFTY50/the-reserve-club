import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncSummary {
  processed: number;
  updated: number;
  skipped: number;
  errored: number;
  details: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY not configured');
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const summary: SyncSummary = { processed: 0, updated: 0, skipped: 0, errored: 0, details: [] };

  try {
    // Get all active memberships with a Stripe subscription ID
    const { data: memberships, error: fetchError } = await supabaseAdmin
      .from('memberships')
      .select('id, customer_id, tier, monthly_price, billing_period_start, billing_period_end, stripe_subscription_id, status')
      .not('stripe_subscription_id', 'is', null)
      .eq('status', 'active');

    if (fetchError) throw fetchError;
    if (!memberships || memberships.length === 0) {
      await supabaseAdmin.from('sync_logs').insert({
        sync_type: 'batch_sync_summary',
        changes: { message: 'No active Stripe memberships found', ...summary },
        status: 'skipped',
      });
      return new Response(JSON.stringify({ message: 'No active Stripe memberships', summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tier definitions for price_id -> tier mapping
    const { data: tierDefs } = await supabaseAdmin
      .from('tier_definitions')
      .select('tier_name, monthly_pours, monthly_price, stripe_price_id');

    const priceIdToTier = new Map<string, { tier_name: string; monthly_pours: number; monthly_price: number }>();
    for (const td of tierDefs || []) {
      if (td.stripe_price_id) {
        priceIdToTier.set(td.stripe_price_id, {
          tier_name: td.tier_name,
          monthly_pours: td.monthly_pours,
          monthly_price: Number(td.monthly_price),
        });
      }
    }

    // Process each membership
    for (const membership of memberships) {
      summary.processed++;
      try {
        // Fetch subscription from Stripe
        const stripeRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${membership.stripe_subscription_id}`,
          { headers: { 'Authorization': `Bearer ${stripeSecretKey}` } }
        );

        if (!stripeRes.ok) {
          const errBody = await stripeRes.text();
          const errorMsg = `Stripe API error ${stripeRes.status}: ${errBody}`;
          summary.errored++;
          summary.details.push(`${membership.id}: ${errorMsg}`);
          await supabaseAdmin.from('sync_logs').insert({
            sync_type: 'stripe_subscription',
            customer_id: membership.customer_id,
            membership_id: membership.id,
            status: 'error',
            error_message: errorMsg,
            changes: {},
          });
          continue;
        }

        const sub = await stripeRes.json();
        const changes: Record<string, { old: unknown; new: unknown }> = {};

        // Determine expected values from Stripe
        const stripePeriodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null;
        const stripePeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const stripePriceId = sub.items?.data?.[0]?.price?.id;
        const stripeStatus = sub.status;

        // Check billing period
        if (stripePeriodStart && membership.billing_period_start !== stripePeriodStart) {
          changes.billing_period_start = { old: membership.billing_period_start, new: stripePeriodStart };
        }
        if (stripePeriodEnd && membership.billing_period_end !== stripePeriodEnd) {
          changes.billing_period_end = { old: membership.billing_period_end, new: stripePeriodEnd };
        }

        // Check tier via price_id
        let newTier: string | null = null;
        let newPrice: number | null = null;
        if (stripePriceId && priceIdToTier.has(stripePriceId)) {
          const tierInfo = priceIdToTier.get(stripePriceId)!;
          if (tierInfo.tier_name !== membership.tier) {
            changes.tier = { old: membership.tier, new: tierInfo.tier_name };
            newTier = tierInfo.tier_name;
          }
          if (tierInfo.monthly_price !== Number(membership.monthly_price)) {
            changes.monthly_price = { old: Number(membership.monthly_price), new: tierInfo.monthly_price };
            newPrice = tierInfo.monthly_price;
          }
        }

        // Check if Stripe subscription is cancelled/past_due
        if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') {
          changes.status = { old: membership.status, new: 'cancelled' };
        }

        // If no changes, skip
        if (Object.keys(changes).length === 0) {
          summary.skipped++;
          await supabaseAdmin.from('sync_logs').insert({
            sync_type: 'stripe_subscription',
            customer_id: membership.customer_id,
            membership_id: membership.id,
            status: 'skipped',
            changes: { message: 'No changes detected' },
          });
          continue;
        }

        // Apply membership updates
        const membershipUpdate: Record<string, unknown> = {};
        if (changes.billing_period_start) membershipUpdate.billing_period_start = changes.billing_period_start.new;
        if (changes.billing_period_end) membershipUpdate.billing_period_end = changes.billing_period_end.new;
        if (changes.tier) membershipUpdate.tier = changes.tier.new;
        if (changes.monthly_price) membershipUpdate.monthly_price = changes.monthly_price.new;
        if (changes.status) membershipUpdate.status = changes.status.new;

        const { error: updateError } = await supabaseAdmin
          .from('memberships')
          .update(membershipUpdate)
          .eq('id', membership.id);

        if (updateError) throw updateError;

        // Sync tier to customers table if changed
        if (newTier) {
          await supabaseAdmin
            .from('customers')
            .update({ tier: newTier })
            .eq('id', membership.customer_id);
        }

        // If subscription cancelled in Stripe, deactivate customer
        if (changes.status) {
          await supabaseAdmin
            .from('customers')
            .update({ status: 'inactive' })
            .eq('id', membership.customer_id);
        }

        summary.updated++;
        await supabaseAdmin.from('sync_logs').insert({
          sync_type: 'stripe_subscription',
          customer_id: membership.customer_id,
          membership_id: membership.id,
          status: 'success',
          changes,
        });
      } catch (membershipError) {
        summary.errored++;
        const errMsg = membershipError instanceof Error ? membershipError.message : String(membershipError);
        summary.details.push(`${membership.id}: ${errMsg}`);
        await supabaseAdmin.from('sync_logs').insert({
          sync_type: 'stripe_subscription',
          customer_id: membership.customer_id,
          membership_id: membership.id,
          status: 'error',
          error_message: errMsg,
          changes: {},
        });
      }
    }

    // Insert summary row
    await supabaseAdmin.from('sync_logs').insert({
      sync_type: 'batch_sync_summary',
      changes: summary,
      status: summary.errored > 0 ? 'error' : 'success',
    });

    console.log('Sync complete:', JSON.stringify(summary));
    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Sync failed:', errMsg);
    await supabaseAdmin.from('sync_logs').insert({
      sync_type: 'batch_sync_summary',
      status: 'error',
      error_message: errMsg,
      changes: summary,
    });
    return new Response(JSON.stringify({ error: errMsg, summary }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
