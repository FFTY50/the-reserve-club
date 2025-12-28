import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

async function checkRateLimit(supabase: any, identifier: string, endpoint: string): Promise<boolean> {
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();
  
  try {
    // Try to get existing rate limit record
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .single();
    
    if (existing) {
      const windowAge = now - existing.window_start;
      
      if (windowAge < RATE_LIMIT_WINDOW_MS) {
        // Still in current window
        if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
          return false; // Rate limited
        }
        // Increment count
        await supabase
          .from('rate_limits')
          .update({ count: existing.count + 1 })
          .eq('key', key);
      } else {
        // New window - reset
        await supabase
          .from('rate_limits')
          .update({ count: 1, window_start: now })
          .eq('key', key);
      }
    } else {
      // Create new record
      await supabase
        .from('rate_limits')
        .insert({ key, count: 1, window_start: now });
    }
    
    return true; // Not rate limited
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow request on error to prevent false positives
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Create admin client for rate limiting check
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check rate limit
    const allowed = await checkRateLimit(supabaseAdmin, clientIp, 'verify-qr-token');
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );

    // Verify authentication and staff role
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use existing admin client for staff verification

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_approved')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'staff') {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify staff is approved
    if (!roleData.is_approved) {
      console.warn('Unapproved staff access attempt:', user.id);
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(
      Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      const { payload } = await jose.jwtVerify(token, secret);
      const tokenJti = payload.jti || `${payload.customer_id}-${payload.iat}`;

      // Verify customer still exists and is active (use admin client)
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('id, tier, status, user_id, secondary_user_id, pours_balance')
        .eq('id', payload.customer_id as string)
        .eq('status', 'active')
        .single();

      if (customerError || !customer) {
        // Log failed verification
        await supabaseAdmin.from('qr_verification_logs').insert({
          customer_id: payload.customer_id as string,
          staff_id: user.id,
          token_jti: tokenJti,
          verification_result: 'failed',
          ip_address: clientIp,
        });
        
        return new Response(JSON.stringify({ error: 'Customer not found or inactive' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get profile data - use the user_id from the token payload to show correct name
      // (could be primary or secondary user)
      const isSecondary = payload.is_secondary as boolean;
      const profileUserId = isSecondary ? customer.secondary_user_id : customer.user_id;
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', profileUserId)
        .single();

      // Log successful verification
      await supabaseAdmin.from('qr_verification_logs').insert({
        customer_id: customer.id,
        staff_id: user.id,
        token_jti: tokenJti,
        verification_result: 'success',
        ip_address: clientIp,
      });
      
      console.log(`QR verified: customer=${customer.id}, staff=${user.id}`);

      return new Response(
        JSON.stringify({ 
          valid: true,
          customer: {
            id: customer.id,
            tier: customer.tier,
            pours_balance: customer.pours_balance,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            is_secondary: isSecondary,
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (jwtError) {
      console.error('JWT verification failed');
      
      // Log invalid/expired token attempt
      try {
        // Try to decode without verification to get customer_id for logging
        const decoded = jose.decodeJwt(token);
        if (decoded.customer_id) {
          await supabaseAdmin.from('qr_verification_logs').insert({
            customer_id: decoded.customer_id as string,
            staff_id: user.id,
            token_jti: decoded.jti || `${decoded.customer_id}-${decoded.iat}`,
            verification_result: 'expired',
            ip_address: clientIp,
          });
        }
      } catch (decodeError) {
        // Token is completely invalid, can't log customer_id
        console.error('Could not decode invalid token for logging');
      }
      
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Request processing failed');
    return new Response(
      JSON.stringify({ error: 'Unable to process request' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
