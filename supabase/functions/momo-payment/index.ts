// supabase/functions/momo-payment/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY");
const MOMO_API_USER = Deno.env.get("MOMO_API_USER");
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY");
const SIMULATION_MODE = Deno.env.get("MOMO_SIMULATION_MODE") === "true";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\+]/g, '');
  if (cleaned.startsWith('237')) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return `237${cleaned}`;
  return cleaned;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const errorResponse = (message: string, status: number, details?: any) => {
    console.error(`❌ ${message}`, details ? JSON.stringify(details) : '');
    return new Response(
      JSON.stringify({ success: false, error: message, details }),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  };

  try {
    // 1. Vérification des variables d'environnement
    if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
      return errorResponse("Configuration MTN MoMo incomplète", 500);
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Configuration Supabase incomplète", 500);
    }

    // 2. Authentification utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse("Token d'authentification manquant", 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return errorResponse("Session expirée ou invalide", 401, userError?.message);
    }
    console.log("✅ Utilisateur authentifié:", user.id);

    // 3. Lecture du body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return errorResponse("Body JSON invalide", 400, e.message);
    }
    console.log("📦 Body reçu:", JSON.stringify(body));

    const { amount, phoneNumber, orderId } = body;
    if (!amount || !phoneNumber || !orderId) {
      return errorResponse("Paramètres manquants (amount, phoneNumber, orderId requis)", 400);
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return errorResponse("Montant invalide", 400);
    }
    const cleanPhone = normalizePhone(phoneNumber);
    const phoneRegex = /^237(650|651|652|653|654|670|671|672|673|674|675|676|677|678|679|680|681|682|683|684)\d{6}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return errorResponse("Numéro MTN invalide", 400, { raw: phoneNumber, normalized: cleanPhone });
    }
    console.log("✅ Paramètres validés:", { amount: parsedAmount, phone: cleanPhone, orderId });

    // 4. Vérification commande
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, total, payment_status")
      .eq("id", orderId)
      .single();
    if (orderError || !order) {
      return errorResponse("Commande introuvable", 404, orderError?.message);
    }
    if (order.user_id !== user.id) {
      return errorResponse("Vous n'êtes pas autorisé à payer cette commande", 403);
    }
    if (order.payment_status === 'paid') {
      return errorResponse("Cette commande est déjà payée", 400);
    }
    console.log("✅ Commande vérifiée:", order.id);

    // 5. Mode simulation
    if (SIMULATION_MODE) {
      console.log("🔧 Mode simulation actif");
      const fakeReferenceId = `sim_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
      try {
        await supabaseAdmin.from("payment_transactions").insert({
          order_id: orderId,
          provider: "mtn_momo",
          amount: parsedAmount,
          provider_transaction_id: fakeReferenceId,
          status: "pending",
          ussd_code: "*126#",
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("❌ Erreur insert simulation:", err);
      }
      return new Response(
        JSON.stringify({ success: true, referenceId: fakeReferenceId, message: "Mode simulation: paiement accepté", ussd: "*126#", simulation: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 6. Obtention token MTN
    const authHeaderMomo = btoa(`${MOMO_API_USER}:${MOMO_API_KEY}`);
    console.log("🔑 Demande token MTN...");
    const tokenRes = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeaderMomo}`,
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
    });
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      return errorResponse(`Erreur d'authentification MTN (${tokenRes.status})`, 502, errorText);
    }
    const { access_token } = await tokenRes.json();
    console.log("✅ Token MTN obtenu");

    // 7. Request to Pay
    const referenceId = crypto.randomUUID();
    const paymentPayload = {
      amount: parsedAmount.toString(),
      currency: "EUR",
      externalId: orderId,
      payer: { partyIdType: "MSISDN", partyId: cleanPhone },
      payerMessage: `Commande CAFCOOP ${orderId.slice(0, 8)}`,
      payeeNote: "Harvest More Africa",
    };
    console.log("📤 Envoi Request to Pay:", JSON.stringify(paymentPayload));
    const payRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox",
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });
    if (!payRes.ok) {
      const payText = await payRes.text();
      let errorMessage = "Erreur lors de l'initiation du paiement";
      if (payRes.status === 400) errorMessage = "Paramètres de paiement invalides";
      else if (payRes.status === 409) errorMessage = "Transaction en doublon détectée";
      else if (payRes.status === 500) errorMessage = "Service MTN temporairement indisponible";
      return errorResponse(errorMessage, 502, { status: payRes.status, details: payText });
    }
    console.log("✅ Paiement initié, referenceId:", referenceId);

    // 8. Sauvegarde transaction
    try {
      await supabaseAdmin.from("payment_transactions").insert({
        order_id: orderId,
        provider: "mtn_momo",
        amount: parsedAmount,
        provider_transaction_id: referenceId,
        status: "pending",
        ussd_code: "*126#",
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error("❌ Erreur insertion payment_transactions:", err);
      // Ne pas bloquer le paiement
    }

    // 9. Réponse succès
    return new Response(
      JSON.stringify({ success: true, referenceId, message: "Paiement initié avec succès", ussd: "*126#" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Erreur non gérée:", message, err);
    return errorResponse("Erreur interne du serveur", 500, message);
  }
});