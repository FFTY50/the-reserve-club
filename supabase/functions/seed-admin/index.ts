import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin has already been seeded
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'admin_seeding')
      .single();

    if (settingsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check seeding status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (settings?.value?.seeded) {
      return new Response(
        JSON.stringify({ error: 'Admin account has already been created', alreadySeeded: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      setupKey: z.string().min(1),
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, firstName, lastName, setupKey } = validationResult.data;

    // Verify setup key from environment
    const expectedSetupKey = Deno.env.get('ADMIN_SETUP_KEY');
    if (!expectedSetupKey) {
      return new Response(
        JSON.stringify({ error: 'Admin setup is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (setupKey !== expectedSetupKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid setup key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      // User exists - update their role to admin
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: 'admin', is_approved: true })
        .eq('user_id', existingUser.id);

      if (roleError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update user role' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as seeded
      await supabaseAdmin
        .from('system_settings')
        .update({ value: { seeded: true, admin_email: email, seeded_at: new Date().toISOString() } })
        .eq('key', 'admin_seeding');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Existing user promoted to admin',
          userId: existingUser.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'admin'
      }
    });

    if (createError || !newUser.user) {
      console.error('Failed to create admin user:', createError?.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create admin account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the role to admin (trigger creates as customer by default based on metadata)
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin', is_approved: true })
      .eq('user_id', newUser.user.id);

    if (roleError) {
      console.error('Failed to update to admin role:', roleError.message);
    }

    // Mark as seeded
    await supabaseAdmin
      .from('system_settings')
      .update({ value: { seeded: true, admin_email: email, seeded_at: new Date().toISOString() } })
      .eq('key', 'admin_seeding');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin account created successfully',
        userId: newUser.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in seed-admin');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});