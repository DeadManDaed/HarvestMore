// supabase/functions/momo-payment/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const MOMO_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

const MOMO_SUBSCRIPTION_KEY = Deno.env.get("MOMO_SUBSCRIPTION_KEY");
const MOMO_API_USER = Deno.env.get("MOMO_API_USER");
const MOMO_API_KEY = Deno.env.get("MOMO_API_KEY");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // ✅ Service Role pour bypass RLS

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. VALIDATION VARIABLES D'ENVIRONNEMENT
    // ═══════════════════════════════════════════════════════════════════════
    if (!MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
      console.error("❌ Variables MOMO manquantes");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Configuration MTN MoMo incomplète" 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Variables Supabase manquantes");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Configuration Supabase incomplète" 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. AUTHENTIFICATION UTILISATEUR
    // ═══════════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Token d'authentification manquant" 
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Client avec token utilisateur (pour vérifier l'auth)
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("❌ Token invalide:", userError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Session expirée ou invalide" 
        }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Utilisateur authentifié:", user.id);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. VALIDATION BODY
    // ═══════════════════════════════════════════════════════════════════════
    const body = await req.json();
    const { amount, phoneNumber, orderId } = body;

    if (!amount || !phoneNumber || !orderId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Paramètres manquants (amount, phoneNumber, orderId requis)" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validation montant
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Montant invalide" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validation téléphone MTN Cameroon
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!/^237(650|651|652|653|654|670|671|672|673|674|675|676|677|678|679|680|681|682|683|684)\d{6}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Numéro MTN invalide (doit commencer par 650-654 ou 670-684)" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Paramètres validés:", { amount: parsedAmount, phone: cleanPhone, orderId });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. VÉRIFICATION COMMANDE
    // ═══════════════════════════════════════════════════════════════════════
    
    // Client admin pour bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, total, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("❌ Commande non trouvée:", orderError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Commande introuvable" 
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (order.user_id !== user.id) {
      console.error("❌ Utilisateur non autorisé");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Vous n'êtes pas autorisé à payer cette commande" 
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Vérifier que pas déjà payée
    if (order.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Cette commande est déjà payée" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Commande vérifiée:", order.id);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. OBTENIR TOKEN MTN MOMO
    // ═══════════════════════════════════════════════════════════════════════
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
      console.error("❌ Échec authentification MTN:", tokenRes.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Erreur de connexion MTN Mobile Money" 
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { access_token } = await tokenRes.json();
    console.log("✅ Token MTN obtenu");

    // ═══════════════════════════════════════════════════════════════════════
    // 6. APPELER REQUEST TO PAY
    // ═══════════════════════════════════════════════════════════════════════
    const referenceId = crypto.randomUUID();

    const paymentPayload = {
      amount: parsedAmount.toString(),
      currency: "XAF",
      externalId: orderId,
      payer: { 
        partyIdType: "MSISDN", 
        partyId: cleanPhone 
      },
      payerMessage: `Commande CAFCOOP ${orderId.slice(0, 8)}`,
      payeeNote: "Harvest More Africa",
    };

    console.log("📤 Request to Pay:", paymentPayload);

    const payRes = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox", // ⚠️ Changer en "mtnCameroon" en production
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": MOMO_SUBSCRIPTION_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!payRes.ok) {
      const payText = await payRes.text();
      console.error("❌ Échec Request to Pay:", payRes.status, payText);
      
      // Erreurs spécifiques MTN
      let errorMessage = "Erreur lors de l'initiation du paiement";
      if (payRes.status === 400) {
        errorMessage = "Paramètres de paiement invalides";
      } else if (payRes.status === 409) {
        errorMessage = "Transaction en doublon détectée";
      } else if (payRes.status === 500) {
        errorMessage = "Service MTN temporairement indisponible";
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: payText 
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Paiement initié:", referenceId);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. SAUVEGARDER TRANSACTION
    // ═══════════════════════════════════════════════════════════════════════
    const { error: insertError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        order_id: orderId,
        provider: "mtn_momo",
        amount: parsedAmount,
        provider_transaction_id: referenceId, // ✅ Nom correct de la colonne
        status: "pending",
        ussd_code: "*126#",
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("❌ Erreur insert payment_transactions:", insertError);
      // ⚠️ Ne pas bloquer le paiement si l'insert échoue
      // Le paiement MTN est déjà initié
    } else {
      console.log("✅ Transaction sauvegardée");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. RÉPONSE SUCCESS
    // ═══════════════════════════════════════════════════════════════════════
    return new Response(
      JSON.stringify({
        success: true,
        referenceId,
        message: "Paiement initié avec succès",
        ussd: "*126#"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Erreur globale:", message, err);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erreur interne du serveur",
        details: message 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
