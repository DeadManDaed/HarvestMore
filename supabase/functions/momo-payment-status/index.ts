// momo-payment-status/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";

const MOMO_BASE_URL = Deno.env.get("MOMO_BASE_URL") || "https://sandbox.momodeveloper.mtn.com";
const MOMO_TARGET_ENV = Deno.env.get("MOMO_TARGET_ENV") || "sandbox";
const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY");
const MOMO_API_USER = Deno.env.get("MOMO_API_USER");
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authentification utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Token manquant" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), { status: 401, headers: corsHeaders });
    }

    // Récupération du referenceId depuis le body
    const { referenceId, orderId } = await req.json();
    if (!referenceId) {
      return new Response(JSON.stringify({ error: "referenceId requis" }), { status: 400, headers: corsHeaders });
    }

    // Vérifier que la transaction appartient bien à l'utilisateur (via orderId optionnel)
    if (orderId) {
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select("user_id")
        .eq("id", orderId)
        .single();
      if (orderError || order.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: corsHeaders });
      }
    }

    // Obtenir un token OAuth MTN
    const authHeaderMomo = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);
    const tokenRes = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeaderMomo}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY!,
      },
    });
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      return new Response(JSON.stringify({ error: "Erreur auth MTN", details: errorText }), { status: 502, headers: corsHeaders });
    }
    const { access_token } = await tokenRes.json();

    // Interroger le statut de la transaction
    const statusRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-Target-Environment": MOMO_TARGET_ENV,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY!,
      },
    });

    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      return new Response(JSON.stringify({ error: "Erreur statut MTN", details: errorText }), { status: statusRes.status, headers: corsHeaders });
    }

    const statusData = await statusRes.json();
    // statusData contient : { status: "SUCCESSFUL" | "FAILED" | "PENDING", ... }

    // Mettre à jour la transaction dans Supabase si le statut est final
    if (statusData.status === "SUCCESSFUL" || statusData.status === "FAILED") {
      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: statusData.status.toLowerCase() })
        .eq("provider_transaction_id", referenceId);

      // Si succès, mettre à jour la commande correspondante (via orderId ou jointure)
      if (statusData.status === "SUCCESSFUL" && orderId) {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "paid", status: "processing" })
          .eq("id", orderId);
      }
    }

    return new Response(JSON.stringify({ status: statusData.status, data: statusData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erreur interne" }), { status: 500, headers: corsHeaders });
  }
});

