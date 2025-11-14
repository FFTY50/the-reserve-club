import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up customer_id from authenticated user (eliminates IDOR vulnerability)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      console.error('Customer lookup error:', customerError);
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customer_id = customer.id;

    // Call the database function to get available pours
    const { data, error } = await supabase.rpc('get_available_pours', {
      customer_uuid: customer_id
    });

    if (error) {
      console.error('Error getting available pours:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get membership details for additional context
    const { data: membership } = await supabase
      .from('memberships')
      .select(`
        tier,
        billing_period_start,
        billing_period_end
      `)
      .eq('customer_id', customer_id)
      .eq('status', 'active')
      .single();

    // Get tier definition
    const { data: tierDef } = await supabase
      .from('tier_definitions')
      .select('monthly_pours')
      .eq('tier_name', membership?.tier)
      .single();

    // Count pours in current period
    let poursUsed = 0;
    if (membership?.billing_period_start) {
      const { data: pours } = await supabase
        .from('pours')
        .select('quantity')
        .eq('customer_id', customer_id)
        .gte('created_at', membership.billing_period_start)
        .eq('status', 'redeemed');
      
      poursUsed = pours?.reduce((sum, pour) => sum + pour.quantity, 0) || 0;
    }

    return new Response(
      JSON.stringify({
        available_pours: data,
        tier_max: tierDef?.monthly_pours || 0,
        pours_used: poursUsed,
        billing_period_start: membership?.billing_period_start,
        billing_period_end: membership?.billing_period_end
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-available-pours:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
