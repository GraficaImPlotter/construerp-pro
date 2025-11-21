// Follows Deno runtime for Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { nick, password } = await req.json();

    // 1. Fetch user
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('nick', nick)
      .limit(1);

    if (error || !users || users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // 2. Verify Password
    // Note: bcrypt.compare is slow, ensure adequate timeout or use simpler hash for demo
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new Error('Invalid credentials');
    }

    // 3. Generate Custom JWT
    // This secret must match the one configured in Supabase Project Settings -> API -> JWT Settings
    const jwtSecret = Deno.env.get('JWT_SECRET') ?? 'super-secret-jwt-key-change-me';
    
    const jwt = await create({ alg: "HS256", type: "JWT" }, {
      sub: user.id,
      role: user.role, // This allows RLS to check auth.jwt() -> role
      exp: getNumericDate(60 * 60 * 24), // 24 hours
    }, await crypto.subtle.importKey("raw", new TextEncoder().encode(jwtSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]));

    return new Response(
      JSON.stringify({ 
        user: { id: user.id, nick: user.nick, role: user.role, permissions: user.permissions },
        token: jwt 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});