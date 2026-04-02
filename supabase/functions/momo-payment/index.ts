// supabase/functions/momo-payment/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

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
    // 1. VALIDATION VARIABLES D'ENVIRONNEMENT
    if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Configuration manquante");
      return new Response(JSON.stringify({ success: false, error: "Serveur mal configuré" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. AUTHENTIFICATION UTILISATEUR (Verification du JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Session invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. RÉCUPÉRATION ET VALIDATION DU BODY
    const { amount, phoneNumber, orderId } = await req.json();
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const parsedAmount = parseFloat(amount);

    // 4. OBTENIR TOKEN MTN MOMO (Avec tes modifications de logs)
    const authHeaderMomo = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);

    const tokenRes = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeaderMomo}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
        "X-Target-Environment": "sandbox", // ✅ Ajouté
      },
    });

    // --- Tes nouveaux logs ---
    console.log("Token response status:", tokenRes.status);
    const tokenText = await tokenRes.text();
    console.log("Token response body:", tokenText);
    // -------------------------

    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ success: false, error: "Erreur Auth MTN", details: tokenText }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // On parse le texte puisqu'on a déjà consommé le flux avec .text()
    const { access_token } = JSON.parse(tokenText);

    // 5. REQUEST TO PAY
    const referenceId = crypto.randomUUID();
    const paymentPayload = {
      amount: parsedAmount.toString(),
      currency: "XAF",
      externalId: orderId,
      payer: { partyIdType: "MSISDN", partyId: cleanPhone },
      payerMessage: `Commande NFBO ${orderId.slice(0,8)}`,
      payeeNote: "Harvest More Africa",
    };

    const payRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox", // ✅ Ajouté/Vérifié
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!payRes.ok) {
      const payError = await payRes.text();
      console.error("❌ Échec Pay:", payRes.status, payError);
      return new Response(JSON.stringify({ success: false, error: "Échec initiation paiement", details: payError }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 6. ENREGISTREMENT TRANSACTION DANS LA DB
    await supabaseAdmin.from("payment_transactions").insert({
      order_id: orderId,
      provider: "mtn_momo",
      amount: parsedAmount,
      provider_transaction_id: referenceId,
      status: "pending",
      created_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ success: true, referenceId, message: "Paiement initié" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ Erreur critique:", err);
    return new Response(JSON.stringify({ success: false, error: "Erreur interne" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
