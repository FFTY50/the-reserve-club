import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PromoWelcomeEmail } from '../_shared/email-templates/promo-welcome.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check - must be admin
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

    const { email, tier, months, notes, existing_customer_id } = await req.json();

    // Validate inputs
    if (!email || !tier || !months) {
      return new Response(JSON.stringify({ error: 'Email, tier, and months are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validTiers = ['select', 'premier', 'elite'];
    if (!validTiers.includes(tier)) {
      return new Response(JSON.stringify({ error: 'Invalid tier. Household is not available for promotional accounts.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (months < 1 || months > 24) {
      return new Response(JSON.stringify({ error: 'Months must be between 1 and 24' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tier definition for pricing/pours info
    const { data: tierDef } = await supabaseAdmin
      .from('tier_definitions')
      .select('monthly_price, monthly_pours, display_name')
      .eq('tier_name', tier)
      .single();

    if (!tierDef) {
      return new Response(JSON.stringify({ error: 'Tier definition not found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId: string;
    let userId: string;

    if (existing_customer_id) {
      // Use existing customer
      const { data: existingCustomer, error: custError } = await supabaseAdmin
        .from('customers')
        .select('id, user_id, status')
        .eq('id', existing_customer_id)
        .single();

      if (custError || !existingCustomer) {
        return new Response(JSON.stringify({ error: 'Customer not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      customerId = existingCustomer.id;
      userId = existingCustomer.user_id;

      // Update customer tier and status
      await supabaseAdmin
        .from('customers')
        .update({ tier, status: 'active', updated_at: new Date().toISOString() })
        .eq('id', customerId);

      // Cancel any existing active memberships (since promo replaces)
      await supabaseAdmin
        .from('memberships')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('status', 'active');

    } else {
      // Create new account from scratch
      // Check if user already exists by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase());

      if (existingUser) {
        userId = existingUser.id;

        // Check if they already have a customer record
        const { data: existingCust } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingCust) {
          return new Response(JSON.stringify({ 
            error: 'User already has an account. Use "Existing Account" option instead.',
            existing_customer_id: existingCust.id,
          }), {
            status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Create new auth user with a random password (they'll reset it)
        const tempPassword = crypto.randomUUID() + 'A1!';
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: '',
            last_name: '',
            role: 'customer',
          },
        });

        if (createError || !newUser.user) {
          return new Response(JSON.stringify({ error: 'Failed to create user account: ' + (createError?.message || '') }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        userId = newUser.user.id;
      }

      // Create customer record
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          user_id: userId,
          tier,
          status: 'active',
          member_since: new Date().toISOString().split('T')[0],
          pours_balance: tierDef.monthly_pours,
          signed_up_by_staff_id: user.id,
        })
        .select('id')
        .single();

      if (customerError || !newCustomer) {
        return new Response(JSON.stringify({ error: 'Failed to create customer: ' + (customerError?.message || '') }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      customerId = newCustomer.id;
    }

    // Calculate billing period and expiry
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const billingEnd = new Date(now);
    billingEnd.setMonth(billingEnd.getMonth() + 1);

    // Create membership record (no Stripe)
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        customer_id: customerId,
        tier,
        monthly_price: 0,
        start_date: now.toISOString().split('T')[0],
        status: 'active',
        toast_reference_number: `PROMO-${Date.now()}`,
        recorded_by_staff_id: user.id,
        billing_period_start: now.toISOString(),
        billing_period_end: billingEnd.toISOString(),
        notes: `Promotional account: ${months} months free. ${notes || ''}`.trim(),
      })
      .select('id')
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: 'Failed to create membership: ' + (membershipError?.message || '') }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create promotional account tracking record
    const { error: promoError } = await supabaseAdmin
      .from('promotional_accounts')
      .insert({
        customer_id: customerId,
        membership_id: membership.id,
        tier,
        email: email.toLowerCase(),
        total_months: months,
        months_remaining: months,
        status: 'active',
        created_by: user.id,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        notes: notes || null,
      });

    if (promoError) {
      return new Response(JSON.stringify({ error: 'Failed to create promo record: ' + promoError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send branded welcome email with password reset link for new users
    if (!existing_customer_id) {
      const siteUrl = Deno.env.get('SITE_URL') || 'https://vinosaborapp.com';
      
      // Generate a password reset link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
        options: { redirectTo: `${siteUrl}/reset-password` },
      });

      if (linkError || !linkData?.properties?.action_link) {
        console.error('Failed to generate reset link:', linkError?.message);
      } else {
        // Render the branded promo welcome email
        const resetPasswordUrl = linkData.properties.action_link;
        const html = await renderAsync(React.createElement(PromoWelcomeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          resetPasswordUrl,
          tierDisplayName: tierDef.display_name,
          months,
          recipientEmail: email.toLowerCase(),
        }));
        const text = await renderAsync(React.createElement(PromoWelcomeEmail, {
          siteName: 'The Reserve Club',
          siteUrl,
          resetPasswordUrl,
          tierDisplayName: tierDef.display_name,
          months,
          recipientEmail: email.toLowerCase(),
        }), { plainText: true });

        const messageId = crypto.randomUUID();

        // Log pending
        await supabaseAdmin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'promo_welcome',
          recipient_email: email.toLowerCase(),
          status: 'pending',
        });

        // Enqueue via the email queue
        const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
          queue_name: 'auth_emails',
          payload: {
            message_id: messageId,
            to: email.toLowerCase(),
            from: 'The Reserve Club <noreply@vinosaborapp.com>',
            sender_domain: 'notify.vinosaborapp.com',
            subject: `You've been gifted a ${tierDef.display_name} membership!`,
            html,
            text,
            purpose: 'transactional',
            label: 'promo_welcome',
            queued_at: new Date().toISOString(),
          },
        });

        if (enqueueError) {
          console.error('Failed to enqueue promo welcome email:', enqueueError.message);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      customer_id: customerId,
      membership_id: membership.id,
      tier,
      months,
      expires_at: expiresAt.toISOString(),
      is_new_account: !existing_customer_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Promotional account creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
