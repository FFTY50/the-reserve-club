import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get customer data - check both primary and secondary user
    let customer = null;
    
    // First try as primary user
    const { data: primaryCustomer, error: primaryError } = await supabaseClient
      .from('customers')
      .select('id, tier, user_id, secondary_user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (primaryCustomer) {
      customer = { ...primaryCustomer, is_secondary: false };
    } else {
      // Try as secondary user
      const { data: secondaryCustomer, error: secondaryError } = await supabaseClient
        .from('customers')
        .select('id, tier, user_id, secondary_user_id')
        .eq('secondary_user_id', user.id)
        .maybeSingle();
      
      if (secondaryCustomer) {
        customer = { ...secondaryCustomer, is_secondary: true };
      }
    }

    if (!customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate JWT token with 10 minute expiry
    const secret = new TextEncoder().encode(
      Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = await new jose.SignJWT({
      customer_id: customer.id,
      tier: customer.tier,
      user_id: user.id,
      is_secondary: customer.is_secondary,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .setSubject(customer.id)
      .sign(secret);

    return new Response(
      JSON.stringify({ 
        token,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        customer_id: customer.id,
        is_secondary: customer.is_secondary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Token generation error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
