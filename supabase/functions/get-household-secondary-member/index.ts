import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`) as string;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error(`[${requestId}] auth.getUser error:`, userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find the caller's household customer record (as the primary)
    const { data: customer, error: customerError } = await adminClient
      .from("customers")
      .select("tier, status, secondary_user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error(`[${requestId}] customer lookup error:`, customerError);
      return new Response(JSON.stringify({ error: "Failed to fetch household" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer || customer.status !== "active" || customer.tier !== "household") {
      return new Response(JSON.stringify({ secondary: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customer.secondary_user_id) {
      return new Response(JSON.stringify({ secondary: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try profiles first
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", customer.secondary_user_id)
      .maybeSingle();

    if (profileError) {
      console.error(`[${requestId}] profile lookup error:`, profileError);
    }

    if (profile?.email) {
      return new Response(JSON.stringify({ secondary: profile }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback to auth user email if profile row is missing
    const { data: authUser, error: authLookupError } = await adminClient.auth.admin.getUserById(
      customer.secondary_user_id
    );

    if (authLookupError) {
      console.error(`[${requestId}] auth admin lookup error:`, authLookupError);
    }

    const secondary = {
      id: customer.secondary_user_id,
      first_name: (authUser?.user?.user_metadata?.first_name ?? null) as string | null,
      last_name: (authUser?.user?.user_metadata?.last_name ?? null) as string | null,
      email: (authUser?.user?.email ?? "") as string,
    };

    return new Response(JSON.stringify({ secondary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${requestId}] get-household-secondary-member error:`, error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
