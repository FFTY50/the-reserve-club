import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PromoWelcomeEmail } from '../_shared/email-templates/promo-welcome.tsx';
import { PromoUpgradeEmail } from '../_shared/email-templates/promo-upgrade.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_approved')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin' || !roleData.is_approved) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, promo_id, extend_months } = await req.json();

    if (!promo_id || !action) {
      return new Response(JSON.stringify({ error: 'promo_id and action are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the promo record
    const { data: promo, error: promoError } = await supabaseAdmin
      .from('promotional_accounts')
      .select('*')
      .eq('id', promo_id)
      .single();

    if (promoError || !promo) {
      return new Response(JSON.stringify({ error: 'Promotional account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'cancel': {
        await supabaseAdmin
          .from('promotional_accounts')
          .update({ status: 'cancelled', months_remaining: 0, updated_at: new Date().toISOString() })
          .eq('id', promo_id);

        await supabaseAdmin
          .from('memberships')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', promo.membership_id);

        await supabaseAdmin
          .from('customers')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('id', promo.customer_id);

        return new Response(JSON.stringify({ success: true, action: 'cancelled' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'extend': {
        if (!extend_months || extend_months < 1 || extend_months > 24) {
          return new Response(JSON.stringify({ error: 'extend_months must be between 1 and 24' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const newTotalMonths = promo.total_months + extend_months;
        const newMonthsRemaining = promo.months_remaining + extend_months;
        const newExpiresAt = new Date(promo.expires_at);
        newExpiresAt.setMonth(newExpiresAt.getMonth() + extend_months);

        await supabaseAdmin
          .from('promotional_accounts')
          .update({
            total_months: newTotalMonths,
            months_remaining: newMonthsRemaining,
            expires_at: newExpiresAt.toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
            notes: `${promo.notes || ''} | Extended +${extend_months} months by admin`.trim(),
          })
          .eq('id', promo_id);

        if (promo.status !== 'active') {
          await supabaseAdmin
            .from('memberships')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', promo.membership_id);

          await supabaseAdmin
            .from('customers')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', promo.customer_id);
        }

        return new Response(JSON.stringify({
          success: true,
          action: 'extended',
          new_total_months: newTotalMonths,
          new_months_remaining: newMonthsRemaining,
          new_expires_at: newExpiresAt.toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'resend_welcome': {
        // Resend the branded promo welcome email (for new users who haven't set their password)
        const siteUrl = Deno.env.get('SITE_URL') || 'https://vinosaborapp.com';

        // Get tier display name
        const { data: tierDef } = await supabaseAdmin
          .from('tier_definitions')
          .select('display_name')
          .eq('tier_name', promo.tier)
          .single();

        const displayName = tierDef?.display_name || promo.tier;

        // Generate a fresh password reset link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: promo.email,
          options: { redirectTo: `${siteUrl}/reset-password` },
        });

        if (linkError || !linkData?.properties?.action_link) {
          return new Response(JSON.stringify({ error: 'Failed to generate reset link: ' + (linkError?.message || '') }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const resetPasswordUrl = linkData.properties.action_link;
        const html = await renderAsync(React.createElement(PromoWelcomeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          resetPasswordUrl,
          tierDisplayName: displayName,
          months: promo.total_months,
          recipientEmail: promo.email,
        }));
        const text = await renderAsync(React.createElement(PromoWelcomeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          resetPasswordUrl,
          tierDisplayName: displayName,
          months: promo.total_months,
          recipientEmail: promo.email,
        }), { plainText: true });

        const messageId = crypto.randomUUID();
        await supabaseAdmin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'promo_welcome',
          recipient_email: promo.email,
          status: 'pending',
        });

        const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            run_id: crypto.randomUUID(),
            message_id: messageId,
            to: promo.email,
            from: 'The Reserve Club <noreply@vinosaborapp.com>',
            sender_domain: 'notify.vinosaborapp.com',
            subject: `You've been gifted a ${displayName} membership!`,
            html,
            text,
            purpose: 'transactional',
            label: 'promo_welcome',
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          return new Response(JSON.stringify({ error: 'Failed to enqueue email: ' + enqueueError.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, action: 'resent_welcome', email: promo.email }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'resend_notification': {
        // Resend the upgrade notification email (for existing customers)
        const siteUrl = Deno.env.get('SITE_URL') || 'https://vinosaborapp.com';

        const { data: tierDef } = await supabaseAdmin
          .from('tier_definitions')
          .select('display_name')
          .eq('tier_name', promo.tier)
          .single();

        const displayName = tierDef?.display_name || promo.tier;

        const html = await renderAsync(React.createElement(PromoUpgradeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          tierDisplayName: displayName,
          months: promo.total_months,
          recipientEmail: promo.email,
        }));
        const text = await renderAsync(React.createElement(PromoUpgradeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          tierDisplayName: displayName,
          months: promo.total_months,
          recipientEmail: promo.email,
        }), { plainText: true });

        const messageId = crypto.randomUUID();
        await supabaseAdmin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'promo_upgrade',
          recipient_email: promo.email,
          status: 'pending',
        });

        const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
          queue_name: 'auth_emails',
          payload: {
            message_id: messageId,
            to: promo.email,
            from: 'The Reserve Club <noreply@vinosaborapp.com>',
            sender_domain: 'notify.vinosaborapp.com',
            subject: `Your membership has been upgraded to ${displayName}!`,
            html,
            text,
            purpose: 'transactional',
            label: 'promo_upgrade',
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          return new Response(JSON.stringify({ error: 'Failed to enqueue email: ' + enqueueError.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, action: 'resent_notification', email: promo.email }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'resend_reset': {
        // Legacy: just send a plain password reset (kept for backward compat)
        const siteUrl = Deno.env.get('SITE_URL') || 'https://vinosaborapp.com';
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: promo.email,
          options: { redirectTo: `${siteUrl}/reset-password` },
        });

        if (linkError || !linkData?.properties?.action_link) {
          return new Response(JSON.stringify({ error: 'Failed to generate reset link: ' + (linkError?.message || '') }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get tier display name
        const { data: tierDef } = await supabaseAdmin
          .from('tier_definitions')
          .select('display_name')
          .eq('tier_name', promo.tier)
          .single();

        const displayName = tierDef?.display_name || promo.tier;
        const resetPasswordUrl = linkData.properties.action_link;

        const html = await renderAsync(React.createElement(PromoWelcomeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          resetPasswordUrl,
          tierDisplayName: displayName,
          months: promo.total_months,
          recipientEmail: promo.email,
        }));
        const text = await renderAsync(React.createElement(PromoWelcomeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          resetPasswordUrl,
          tierDisplayName: displayName,
          months: promo.total_months,
          recipientEmail: promo.email,
        }), { plainText: true });

        const messageId = crypto.randomUUID();
        await supabaseAdmin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'promo_welcome',
          recipient_email: promo.email,
          status: 'pending',
        });

        const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
          queue_name: 'auth_emails',
          payload: {
            message_id: messageId,
            to: promo.email,
            from: 'The Reserve Club <noreply@vinosaborapp.com>',
            sender_domain: 'notify.vinosaborapp.com',
            subject: `You've been gifted a ${displayName} membership!`,
            html,
            text,
            purpose: 'transactional',
            label: 'promo_welcome',
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          return new Response(JSON.stringify({ error: 'Failed to enqueue email: ' + enqueueError.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, action: 'resent_reset', email: promo.email }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Use: cancel, extend, resend_welcome, resend_notification, resend_reset' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Manage promotional account error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
