import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('Auth check:', user?.id ? 'authenticated' : 'failed', authError?.message || '');
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

      case 'resend_welcome':
      case 'resend_reset': {
        // Send a password reset email via the built-in auth system.
        // This flows through auth-email-hook and sends the branded recovery email.
        const siteUrl = Deno.env.get('SITE_URL') || 'https://vinosaborapp.com';

        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
          promo.email,
          { redirectTo: `${siteUrl}/reset-password` }
        );

        if (resetError) {
          return new Response(JSON.stringify({ error: 'Failed to send reset email: ' + resetError.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Password reset email triggered for promo user:', promo.email);

        return new Response(JSON.stringify({
          success: true,
          action: action === 'resend_welcome' ? 'resent_welcome' : 'resent_reset',
          email: promo.email,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'resend_notification': {
        // For existing customers who got upgraded — send a password reset so they
        // know to log in and see their new tier.
        const siteUrl = Deno.env.get('SITE_URL') || 'https://vinosaborapp.com';

        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
          promo.email,
          { redirectTo: `${siteUrl}/reset-password` }
        );

        if (resetError) {
          return new Response(JSON.stringify({ error: 'Failed to send notification email: ' + resetError.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true, action: 'resent_notification', email: promo.email }), {
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
