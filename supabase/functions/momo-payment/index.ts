// // supabase/functions/momo-payment/index.ts
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
    // ═══════════════════════════════════════════════════════════════════════
    // 1. VALIDATION VARIABLES D'ENVIRONNEMENT (Ton code d'origine conservé)
    // ═══════════════════════════════════════════════════════════════════════
    if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Variables manquantes");
      return new Response(JSON.stringify({ success: false, error: "Configuration incomplète" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. AUTHENTIFICATION UTILISATEUR
    // ═══════════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Token manquant" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Session invalide" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. VALIDATION BODY & TÉLÉPHONE (Ton Regex conservé)
    // ═══════════════════════════════════════════════════════════════════════
    const body = await req.json();
    const { amount, phoneNumber, orderId } = body;

    const parsedAmount = parseFloat(amount);
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    // Ton Regex spécifique MTN Cameroon
    if (!/^237(650|651|652|653|654|670|671|672|673|674|675|676|677|678|679|680|681|682|683|684)\d{6}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ success: false, error: "Numéro MTN invalide" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. VÉRIFICATION COMMANDE (Ton check RLS/Propriétaire)
    // ═══════════════════════════════════════════════════════════════════════
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order || order.user_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: "Commande invalide ou non autorisée" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. OBTENIR TOKEN MTN MOMO (Modifié avec tes ajouts)
    // ═══════════════════════════════════════════════════════════════════════
    const authHeaderMomo = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);

    const tokenRes = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeaderMomo}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
        "X-Target-Environment": "sandbox",   // ← Ajouté
      },
    });

    // Tes nouveaux logs
    console.log("Token response status:", tokenRes.status);
    const tokenText = await tokenRes.text();
    console.log("Token response body:", tokenText);

    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ success: false, error: "Erreur Auth MTN", details: tokenText }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { access_token } = JSON.parse(tokenText);

    // ═══════════════════════════════════════════════════════════════════════
    // 6. APPELER REQUEST TO PAY (Modifié avec tes ajouts)
    // ═══════════════════════════════════════════════════════════════════════
    const referenceId = crypto.randomUUID();
    const paymentPayload = {
      amount: parsedAmount.toString(),
      currency: "XAF",
      externalId: orderId,
      payer: { partyIdType: "MSISDN", partyId: cleanPhone },
      payerMessage: `Commande NFBO ${orderId.slice(0, 8)}`,
      payeeNote: "Harvest More Africa",
    };

    const payRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox",   // ← Ajouté
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!payRes.ok) {
      const payText = await payRes.text();
      console.error("❌ Échec Pay:", payRes.status, payText);
      return new Response(JSON.stringify({ success: false, error: "Échec MTN", details: payText }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. SAUVEGARDER TRANSACTION (Ta logique de table)
    // ═══════════════════════════════════════════════════════════════════════
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
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err) {
    console.error("❌ Erreur globale:", err.message);
    return new Response(JSON.stringify({ success: false, error: "Erreur interne" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
