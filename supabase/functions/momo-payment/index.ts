// momo-payment/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY");
const MOMO_API_USER = Deno.env.get("MOMO_API_USER");
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Variables d'environnement MOMO manquantes" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Variables d'environnement Supabase manquantes" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1) Auth requise: Bearer <token>
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentification requise" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const token = authHeader.split(" ")[1];

    // 2) Vérifier le token côté Supabase
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 3) Body
    const body = await req.json();
    const { amount, phoneNumber, orderId } = body as {
      amount: number | string;
      phoneNumber: string;
      orderId: string | number;
    };

    if (!amount || !phoneNumber || !orderId) {
      return new Response(
        JSON.stringify({ error: "amount, phoneNumber et orderId sont requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 4) Vérifier la commande appartient à l’utilisateur
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("id, user_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Commande non trouvée" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Vous n'êtes pas autorisé" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5) Obtenir token MTN/MOMO
    const authHeaderMomo = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);

    const tokenRes = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeaderMomo}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Échec auth MOMO: ${tokenRes.status} - ${errorText}`);
    }

    const { access_token } = await tokenRes.json();

    // 6) Appeler Request To Pay
    const referenceId = crypto.randomUUID();

    const payRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox",
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "XAF",
        externalId: orderId,
        payer: { partyIdType: "MSISDN", partyId: phoneNumber },
        payerMessage: `Commande ${orderId}`,
        payeeNote: "Harvest More App",
      }),
    });

    if (!payRes.ok) {
      const payText = await payRes.text();
      throw new Error(`Échec paiement: ${payRes.status} - ${payText}`);
    }

    // 7) Sauvegarder la transaction
    const { error: insertError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        order_id: orderId,
        provider: "momo",
        amount: amount,
        reference_id: referenceId,
        status: "pending",
        user_id: user.id,
      });

    if (insertError) {
      // option: on n’annule pas le paiement momo, mais on remonte l’erreur
      throw new Error(`Erreur insert payment_transactions: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        referenceId,
        message: "Paiement initié",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur:", message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
