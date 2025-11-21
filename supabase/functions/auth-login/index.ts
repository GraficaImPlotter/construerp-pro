// auth-login Edge Function
// rota: https://<project>.supabase.co/functions/v1/auth-login

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

serve(async (req) => {
  try {
    const { nick, password } = await req.json();

    if (!nick || !password) {
      return new Response(JSON.stringify({ error: "Missing credentials" }), {
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Buscar usuário real
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("nick", nick)
      .single();

    if (error || !user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 401,
      });
    }

    // Validar senha com bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
      });
    }

    // Criar um JWT válido
    const payload = {
      sub: user.id,
      role: user.role,
      nick: user.nick,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 dias
    };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(Deno.env.get("JWT_SECRET")!),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(key);

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          nick: user.nick,
          role: user.role,
          full_name: user.full_name,
        },
        token: jwt,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
